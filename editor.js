/* Visual project editor. Only content is stored locally; tokens are never persisted. */
(() => {
'use strict';
const tools = window.PortfolioContentTools;
const qs = selector => document.querySelector(selector);
const qsa = selector => [...document.querySelectorAll(selector)];
const photoStrip = qs('#photoStrip');
const REPOSITORY_API = 'https://api.github.com/repos/yienliu84/Portfolio';
const API = REPOSITORY_API + '/contents/content.js';
const GIT_API = REPOSITORY_API + '/git';
const MAX_PHOTO_BYTES = 20_000_000;
const draft = tools.readDraft();
let content = tools.clone(draft?.content || window.PORTFOLIO_CONTENT);
let baseline = tools.clone(draft?.baseline || window.PORTFOLIO_CONTENT);
let baseSha = draft?.baseSha || null;
let edited = Boolean(draft?.edited);
let removedPhotos = tools.clone(draft?.removedPhotos || {});
let stagedPaths = draft?.stagedPaths || [];
const photoPreview = tools.createPhotoPreview();
let busy = false;
let draggedThumbnail = null;
let dropThumbnail = null;
let selectedProject = new URLSearchParams(location.search).get('project');
if (!content.projects[selectedProject]) selectedProject = Object.keys(content.projects)[0];
const positions = new Map();
const requestedPhoto = new URLSearchParams(location.search).get('photo');
const requestedIndex = content.projects[selectedProject].images.findIndex(photo => photo.id === requestedPhoto);
if (requestedIndex >= 0) positions.set(selectedProject, requestedIndex);

function status(message, error=false) {
  qs('#draftStatus').textContent = message;
  qs('#draftStatus').classList.toggle('error', error);
}
function publishStatus(message, error=false) {
  qs('#publishStatus').textContent = message;
  qs('#publishStatus').classList.toggle('error', error);
}
function uploadStatus(message, error=false) {
  const feedback = qs('#uploadStatus');
  feedback.textContent = message;
  feedback.hidden = !message;
  feedback.classList.toggle('error', error);
}
function activeStagedPaths() {
  const staged = new Set(stagedPaths);
  return Object.values(content.projects).flatMap(project => project.images)
    .map(photo => photo.src).filter(path => staged.has(path));
}
function activePhoto() { return content.projects[selectedProject].images[positions.get(selectedProject) || 0]; }
function readPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function writePath(object, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((object, key) => object[key], object);
  parent[last] = value;
}
function postPreview() {
  const lastPhoto = Math.max(0, content.projects[selectedProject].images.length - 1);
  const photoIndex = Math.min(positions.get(selectedProject) || 0, lastPhoto);
  qs('#previewFrame').contentWindow?.postMessage({type:'portfolio-preview', content, stagedPaths:activeStagedPaths(), project:selectedProject, photoIndex}, location.origin);
}
function saveDraft(showStatus=true) {
  let saved = false;
  try {
    localStorage.setItem(tools.DRAFT_KEY, JSON.stringify({version:3, content, baseline, baseSha, edited, removedPhotos, stagedPaths, savedAt:Date.now()}));
    saved = true;
    if (showStatus) status(edited ? 'Draft saved on this browser — not published yet.' : 'Showing the published portfolio.');
  } catch {
    status('Browser storage is unavailable. Download your draft before closing this page.', true);
  }
  postPreview();
  return saved;
}
function renderProjectSelect() {
  const select = qs('#projectSelect');
  select.replaceChildren();
  for (const [key, project] of Object.entries(content.projects)) {
    const option = document.createElement('option');
    option.value = key; option.textContent = project.title;
    select.append(option);
  }
  select.value = selectedProject;
}
function renderPhoto() {
  const project = content.projects[selectedProject];
  const count = project.images.length;
  const index = Math.max(0, Math.min(positions.get(selectedProject) || 0, count));
  positions.set(selectedProject, index);
  const photo = project.images[index];
  const image = qs('#editorPhoto');
  image.hidden = !photo; qs('#addPhotoSlide').hidden = Boolean(photo);
  if (photo) { image.src = photoPreview.src(photo.src); image.alt = photo.alt; }
  else { image.removeAttribute('src'); image.alt = ''; }
  qs('#photoCount').textContent = photo ? (index + 1) + ' / ' + count : 'Add photos';
  qsa('[data-photo-field]').forEach(field => {
    field.value = photo?.[field.dataset.photoField] || ''; field.disabled = !photo;
  });
  qs('#previousPhoto').disabled = count === 0;
  const next = qs('#nextPhoto');
  const nextAddsPhotos = Boolean(photo) && index === count - 1;
  next.disabled = count === 0;
  next.textContent = nextAddsPhotos ? 'Add photos →' : 'Next →';
  next.setAttribute('aria-label', nextAddsPhotos ? 'Next slide: Add photos' : 'Next slide');
  qs('#deletePhoto').disabled = !photo;
  qs('#undoPhoto').disabled = !(removedPhotos[selectedProject]?.length);
  qs('#photoOrderControls').hidden = count < 2;
  qs('#movePhotoEarlier').disabled = !photo || index === 0;
  qs('#movePhotoLater').disabled = !photo || index >= count - 1;
  const hasNewPhotos = activeStagedPaths().length > 0;
  qs('#copyContent').disabled = hasNewPhotos;
  qs('#manualPhotoHelp').hidden = !hasNewPhotos;
  endPhotoDrag();
  photoStrip.replaceChildren();
  project.images.forEach((photo, photoIndex) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-choice' + (photoIndex === index ? ' active' : '');
    button.dataset.photoIndex = photoIndex;
    button.draggable = count > 1;
    button.setAttribute('aria-label', 'Edit photo ' + (photoIndex + 1) + ': ' + photo.title);
    button.setAttribute('aria-pressed', String(photoIndex === index));
    const image = document.createElement('img'); image.src = photoPreview.src(photo.src); image.alt = ''; image.loading = 'lazy'; image.draggable = false;
    const number = document.createElement('span'); number.textContent = photoIndex + 1;
    button.append(image, number); photoStrip.append(button);
  });
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'photo-choice add-photo-choice' + (photo ? '' : ' active');
  add.dataset.photoIndex = count;
  add.setAttribute('aria-label', 'Go to add photos slide');
  add.setAttribute('aria-pressed', String(!photo));
  add.textContent = '+';
  photoStrip.append(add);
}
function renderProject() {
  const project = content.projects[selectedProject];
  qsa('[data-field]').forEach(field => {
    const value = readPath(project, field.dataset.field);
    field.value = field.dataset.list === 'lines' ? value.join('\n') : (value || '');
  });
  renderPhoto(); postPreview();
}
function movePhoto(index) {
  const slideCount = content.projects[selectedProject].images.length + 1;
  const position = ((index % slideCount) + slideCount) % slideCount;
  positions.set(selectedProject, position);
  renderPhoto(); postPreview();
  if (position === slideCount - 1) qs('#addPhotoSlide').focus();
}
function reorderPhoto(from, to) {
  const images = content.projects[selectedProject].images;
  if (busy || !images[from] || !images[to] || from === to) return;
  const [photo] = images.splice(from, 1);
  images.splice(to, 0, photo);
  positions.set(selectedProject, to);
  edited = true;
  renderPhoto();
  saveDraft();
}
function clearDropMarker() {
  dropThumbnail?.classList.remove('drop-before', 'drop-after');
  dropThumbnail = null;
}
function endPhotoDrag() {
  clearDropMarker();
  draggedThumbnail?.classList.remove('dragging');
  draggedThumbnail = null;
}
function setEnabled(enabled) {
  qs('#projectSelect').disabled = !enabled;
  qs('#projectFields').disabled = !enabled;
  qs('#photoFields').disabled = !enabled;
  qs('#reloadPublished').disabled = !enabled;
  qs('#publishButton').disabled = !enabled;
}

async function request(url, token='', options={}) {
  const headers = {'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10'};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {...options, headers, cache:'no-store', credentials:'omit'});
  let data;
  try { data = await response.json(); } catch { throw new Error('GitHub returned an unreadable response. Your draft is still here.'); }
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub did not accept this token. Check the token or create a new one.');
    if (response.status === 403) throw new Error('GitHub denied access or its rate limit was reached. Check repository Contents write access, then try again.');
    if (response.status === 409 || (options.method === 'PATCH' && response.status === 422)) throw new Error('GitHub could not update the branch. Your draft is still here. Try again or check the repository’s branch settings.');
    if (response.status === 404) throw new Error('GitHub could not open this repository with the provided access. Select Portfolio when creating the token.');
    throw new Error('GitHub could not save the file (HTTP ' + response.status + '). Your draft is still here.');
  }
  return data;
}
async function getPublished(token='', ref='main') {
  const file = await request(API + '?ref=' + ref, token);
  return {sha:file.sha, content:tools.parse(tools.decode(file.content))};
}
function matchesBaseline(published) {
  return baseSha ? published.sha === baseSha : tools.serialize(published.content) === tools.serialize(baseline);
}

async function preparePhoto(file) {
  if (file.size > MAX_PHOTO_BYTES) throw new Error(file.name + ' exceeds 20 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const header = String.fromCharCode(...bytes);
  let extension;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg';
  else if (header.startsWith('\x89PNG\r\n\x1a\n')) extension = 'png';
  else if (header.startsWith('RIFF') && header.slice(8) === 'WEBP') extension = 'webp';
  else if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) extension = 'gif';
  else throw new Error(file.name + ' must be a JPG, PNG, WebP, or GIF image.');
  const blob = file.slice(0, file.size, 'image/' + (extension === 'jpg' ? 'jpeg' : extension));
  try {
    const image = await createImageBitmap(blob);
    image.close();
  } catch {
    throw new Error(file.name + ' could not be opened as an image.');
  }
  const id = crypto.randomUUID();
  const src = 'assets/photos/' + id + '.' + extension;
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Project photo';
  return {blob, photo:{id, src, title, caption:'', alt:title}};
}

async function publishDraft(snapshot, paths, token) {
  const source = tools.serialize(snapshot);
  const message = 'Update portfolio projects, photos, and captions';
  const body = data => JSON.stringify(data);
  const head = paths.length ? (await request(GIT_API + '/ref/heads/main', token)).object.sha : null;
  const published = await getPublished(token, head || 'main');
  const contentAlreadySaved = tools.serialize(published.content) === source;
  if (!matchesBaseline(published) && !(head && contentAlreadySaved)) {
    throw new Error('GitHub has newer changes than this draft. Download your draft before loading the published version.');
  }
  if (!head) {
    const result = await request(API, token, {method:'PUT', body:body({
      message, content:tools.encode(source), sha:published.sha, branch:'main'
    })});
    return {blobSha:result.content.sha, commitSha:result.commit.sha};
  }
  const parent = await request(GIT_API + '/commits/' + head, token);
  const tree = [];
  if (contentAlreadySaved) {
    const publishedTree = await request(GIT_API + '/trees/' + parent.tree.sha + '?recursive=1', token);
    if (publishedTree.truncated) throw new Error('GitHub could not verify all published photos. Your draft is still here.');
    const existing = new Set(publishedTree.tree.filter(entry => entry.type === 'blob').map(entry => entry.path));
    paths = paths.filter(path => !existing.has(path));
    if (!paths.length) return {blobSha:published.sha, commitSha:head};
  } else {
    tree.push({path:'content.js', mode:'100644', type:'blob', content:source});
  }
  const files = await Promise.all(paths.map(tools.readPhotoFile));
  if (files.some(file => !file)) throw new Error('A photo file is missing from this browser’s draft. Open the editor in the browser you used to add it, or add it again from the original file.');
  for (const [index, file] of files.entries()) {
    publishStatus('Uploading photo ' + (index + 1) + ' of ' + files.length + '…');
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const blob = await request(GIT_API + '/blobs', token, {method:'POST', body:body({content:image, encoding:'base64'})});
    tree.push({path:paths[index], mode:'100644', type:'blob', sha:blob.sha});
  }
  publishStatus('Saving changes to GitHub…');
  const nextTree = await request(GIT_API + '/trees', token, {method:'POST', body:body({base_tree:parent.tree.sha, tree})});
  const commit = await request(GIT_API + '/commits', token, {method:'POST', body:body({message, tree:nextTree.sha, parents:[head]})});
  await request(GIT_API + '/refs/heads/main', token, {method:'PATCH', body:body({sha:commit.sha, force:false})});
  return {blobSha:contentAlreadySaved ? published.sha : null, commitSha:commit.sha};
}

qsa('[data-field]').forEach(field => field.addEventListener('input', () => {
  const value = field.dataset.list === 'lines' ? field.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : field.value;
  writePath(content.projects[selectedProject], field.dataset.field, value);
  if (field.dataset.field === 'title') qs('#projectSelect').selectedOptions[0].textContent = value || '(Untitled project)';
  edited = true; saveDraft();
}));
qsa('[data-photo-field]').forEach(field => field.addEventListener('input', () => {
  if (!activePhoto()) return;
  activePhoto()[field.dataset.photoField] = field.value;
  if (field.dataset.photoField === 'alt') qs('#editorPhoto').alt = field.value;
  edited = true; saveDraft();
}));
qs('#projectSelect').addEventListener('change', event => { selectedProject = event.target.value; uploadStatus(''); renderProject(); });
qs('#addPhotoSlide').addEventListener('click', () => qs('#addPhotos').click());
qs('#addPhotos').addEventListener('change', async event => {
  const files = [...event.target.files];
  event.target.value = '';
  if (busy || !files.length) return;
  busy = true;
  setEnabled(false);
  uploadStatus('Adding photos to your draft…');
  let paths = [];
  try {
    const photos = [];
    for (const file of files) photos.push(await preparePhoto(file));
    paths = photos.map(({photo}) => photo.src);
    await tools.savePhotoFiles(photos);
    await photoPreview.load(paths);
    const project = content.projects[selectedProject];
    const first = project.images.length;
    const previousPosition = positions.get(selectedProject);
    const wasEdited = edited;
    project.images.push(...photos.map(({photo}) => photo));
    stagedPaths.push(...paths);
    positions.set(selectedProject, first);
    edited = true;
    if (!saveDraft()) {
      project.images.splice(first);
      stagedPaths.splice(-paths.length);
      positions.set(selectedProject, previousPosition);
      edited = wasEdited;
      postPreview();
      throw new Error('This browser could not save the new photos to your draft.');
    }
    renderPhoto();
    uploadStatus(photos.length === 1 ? 'Photo added to your draft.' : photos.length + ' photos added to your draft.');
  } catch (error) {
    await tools.removePhotoFiles(paths).catch(() => {});
    uploadStatus(error.message || 'This browser could not save the photos. Please try again.', true);
  } finally {
    busy = false;
    setEnabled(true);
  }
});
qs('#previousPhoto').addEventListener('click', () => movePhoto((positions.get(selectedProject) || 0) - 1));
qs('#nextPhoto').addEventListener('click', () => movePhoto((positions.get(selectedProject) || 0) + 1));
qs('#deletePhoto').addEventListener('click', () => {
  if (busy || !activePhoto()) return;
  const project = content.projects[selectedProject];
  const index = positions.get(selectedProject) || 0;
  (removedPhotos[selectedProject] ||= []).push({photo:tools.clone(project.images[index]), index});
  project.images.splice(index, 1);
  positions.set(selectedProject, Math.max(0, Math.min(index, project.images.length - 1)));
  edited = true; renderPhoto(); saveDraft();
  status('Photo deleted from your draft. Undo the deletion or publish to update the portfolio.');
  if (!project.images.length) qs('#addPhotoSlide').focus();
});
qs('#undoPhoto').addEventListener('click', () => {
  if (busy) return;
  const deletion = removedPhotos[selectedProject]?.pop();
  if (!deletion) return;
  const project = content.projects[selectedProject];
  const index = Math.min(deletion.index, project.images.length);
  project.images.splice(index, 0, deletion.photo);
  positions.set(selectedProject, index);
  edited = true; renderPhoto(); saveDraft(); status('Photo restored to your draft.');
});
photoStrip.addEventListener('click', event => {
  const button = event.target.closest('[data-photo-index]');
  if (button) movePhoto(Number(button.dataset.photoIndex));
});
for (const [selector, step] of [['#movePhotoEarlier', -1], ['#movePhotoLater', 1]]) {
  qs(selector).addEventListener('click', event => {
    const index = positions.get(selectedProject) || 0;
    reorderPhoto(index, index + step);
    if (event.currentTarget.disabled) photoStrip.children[positions.get(selectedProject)]?.focus();
  });
}
photoStrip.addEventListener('dragstart', event => {
  const thumbnail = event.target.closest('[draggable="true"][data-photo-index]');
  if (busy || !thumbnail) { event.preventDefault(); return; }
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', thumbnail.dataset.photoIndex);
  draggedThumbnail = thumbnail;
  thumbnail.classList.add('dragging');
});
photoStrip.addEventListener('dragover', event => {
  if (!draggedThumbnail) return;
  event.preventDefault();
  const {left, right} = photoStrip.getBoundingClientRect();
  if (event.clientX < left + 24) photoStrip.scrollLeft -= 16;
  if (event.clientX > right - 24) photoStrip.scrollLeft += 16;
  const target = event.target.closest('[data-photo-index]');
  if (target === dropThumbnail) return;
  clearDropMarker();
  if (!target || target === draggedThumbnail) return;
  const from = Number(draggedThumbnail.dataset.photoIndex);
  const to = Number(target.dataset.photoIndex);
  const isPlus = target.classList.contains('add-photo-choice');
  const last = content.projects[selectedProject].images.length - 1;
  if (isPlus && from === last) return;
  target.classList.add(isPlus || to < from ? 'drop-before' : 'drop-after');
  dropThumbnail = target;
});
photoStrip.addEventListener('dragleave', event => {
  if (!photoStrip.contains(event.relatedTarget)) clearDropMarker();
});
photoStrip.addEventListener('drop', event => {
  if (!draggedThumbnail) return;
  event.preventDefault();
  const target = event.target.closest('[data-photo-index]');
  const from = Number(draggedThumbnail.dataset.photoIndex);
  endPhotoDrag();
  if (!target) return;
  const last = content.projects[selectedProject].images.length - 1;
  reorderPhoto(from, Math.min(Number(target.dataset.photoIndex), last));
});
photoStrip.addEventListener('dragend', endPhotoDrag);
qs('#previewFrame').addEventListener('load', postPreview);
qs('#downloadContent').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([tools.serialize(content)], {type:'text/javascript;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'content.js';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  publishStatus(activeStagedPaths().length
    ? 'Downloaded your project text and captions. Use Publish to GitHub to publish the new photos.'
    : 'Downloaded your draft. Upload this content.js to the repository to publish it.');
});
qs('#copyContent').addEventListener('click', async () => {
  const source = tools.serialize(content);
  try {
    await navigator.clipboard.writeText(source);
    publishStatus('Copied. Open the GitHub editor, replace the entire file, then commit the change.');
  } catch {
    qs('#manualCopy').hidden = false; qs('#manualCopy').value = source;
    qs('#manualCopy').focus(); qs('#manualCopy').select();
    publishStatus('Select and copy the text below, then paste it into the GitHub editor.');
  }
});
qs('#reloadPublished').addEventListener('click', async () => {
  if (edited && !window.confirm('Replace this browser’s draft with the current published text? Download your draft first if you want to keep it.')) return;
  if (busy) return;
  busy = true; setEnabled(false); status('Loading the published version…');
  try {
    const published = await getPublished();
    content = tools.clone(published.content); baseline = tools.clone(published.content); baseSha = published.sha; edited = false;
    removedPhotos = {};
    const previousPaths = stagedPaths;
    stagedPaths = [];
    uploadStatus('');
    renderProjectSelect(); renderProject();
    if (saveDraft()) await tools.removePhotoFiles(previousPaths).catch(() => {});
    publishStatus('Loaded the published version.');
  } catch (error) { status(error.message, true); }
  finally { busy = false; setEnabled(true); }
});
qs('#publishForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  let token = qs('#githubToken').value.trim();
  if (!token) { publishStatus('Enter a GitHub token to publish, or use the GitHub website option below.', true); return; }
  busy = true; setEnabled(false); qs('#githubToken').disabled = true;
  qs('#publishButton').textContent = 'Publishing…'; publishStatus('Checking the current published version…');
  try {
    const snapshot = tools.clone(content);
    const result = await publishDraft(snapshot, activeStagedPaths(), token);
    baseSha = result.blobSha; baseline = tools.clone(snapshot); edited = false;
    removedPhotos = {};
    const previousPaths = stagedPaths;
    stagedPaths = [];
    uploadStatus('');
    renderPhoto();
    if (saveDraft(false)) await tools.removePhotoFiles(previousPaths).catch(() => {});
    status('Saved to GitHub. The public site will update when GitHub Pages finishes publishing.');
    publishStatus('Published to GitHub. ');
    const link = document.createElement('a'); link.textContent = 'View the saved change ↗';
    link.href = 'https://github.com/yienliu84/Portfolio/commit/' + result.commitSha;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; qs('#publishStatus').append(link);
  } catch (error) { publishStatus(error.message, true); saveDraft(false); }
  finally {
    token = ''; qs('#githubToken').value = ''; qs('#githubToken').disabled = false;
    busy = false; setEnabled(true); qs('#publishButton').textContent = 'Publish to GitHub';
  }
});

async function initialize() {
  setEnabled(false);
  await photoPreview.load(activeStagedPaths()).catch(() => {});
  renderProjectSelect(); renderProject();
  try {
    const published = await getPublished();
    if (draft && edited) {
      if (!matchesBaseline(published)) {
        if (activeStagedPaths().length && tools.serialize(published.content) === tools.serialize(content)) {
          status('Draft restored. Choose Publish to GitHub to finish saving any photos still missing.');
        } else {
          status('Draft restored. GitHub has newer changes; download this draft before loading the published version.', true);
        }
      } else {
        baseline = tools.clone(published.content); baseSha = published.sha;
        saveDraft();
      }
    } else {
      content = tools.clone(published.content); baseline = tools.clone(published.content); baseSha = published.sha; edited = false;
      removedPhotos = {}; stagedPaths = [];
      renderProjectSelect(); renderProject(); saveDraft();
    }
  } catch {
    saveDraft(false); status('Editing is available. GitHub will be checked again when you publish.');
  } finally { setEnabled(true); }
}
initialize();
})();
