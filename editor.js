/* Visual project editor. Only content is stored locally; tokens are never persisted. */
(() => {
'use strict';
const tools = window.PortfolioContentTools;
const qs = selector => document.querySelector(selector);
const qsa = selector => [...document.querySelectorAll(selector)];
const API = 'https://api.github.com/repos/yienliu84/Portfolio/contents/content.js';
const draft = tools.readDraft();
let content = tools.clone(draft?.content || window.PORTFOLIO_CONTENT);
let baseline = tools.clone(draft?.baseline || window.PORTFOLIO_CONTENT);
let baseSha = draft?.baseSha || null;
let edited = Boolean(draft?.edited);
let removedPhotos = tools.clone(draft?.removedPhotos || {});
let busy = false;
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
function activePhoto() { return content.projects[selectedProject].images[positions.get(selectedProject) || 0]; }
function readPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function writePath(object, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((object, key) => object[key], object);
  parent[last] = value;
}
function postPreview() {
  qs('#previewFrame').contentWindow?.postMessage({type:'portfolio-preview', content, project:selectedProject, photoIndex:positions.get(selectedProject) || 0}, location.origin);
}
function saveDraft(showStatus=true) {
  try {
    localStorage.setItem(tools.DRAFT_KEY, JSON.stringify({version:3, content, baseline, baseSha, edited, removedPhotos, savedAt:Date.now()}));
    if (showStatus) status(edited ? 'Draft saved on this browser — not published yet.' : 'Showing the published text.');
  } catch {
    status('Browser storage is unavailable. Download your draft before closing this page.', true);
  }
  postPreview();
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
  const index = Math.max(0, Math.min(positions.get(selectedProject) || 0, project.images.length - 1));
  positions.set(selectedProject, index);
  const photo = project.images[index];
  const image = qs('#editorPhoto');
  image.hidden = !photo; qs('#emptyPhotos').hidden = Boolean(photo);
  if (photo) { image.src = photo.src; image.alt = photo.alt; }
  else { image.removeAttribute('src'); image.alt = ''; }
  qs('#photoCount').textContent = (photo ? index + 1 : 0) + ' / ' + project.images.length;
  qsa('[data-photo-field]').forEach(field => {
    field.value = photo?.[field.dataset.photoField] || ''; field.disabled = !photo;
  });
  qs('#previousPhoto').disabled = project.images.length < 2;
  qs('#nextPhoto').disabled = project.images.length < 2;
  qs('#deletePhoto').disabled = !photo;
  qs('#undoPhoto').disabled = !(removedPhotos[selectedProject]?.length);
  const strip = qs('#photoStrip'); strip.replaceChildren();
  project.images.forEach((photo, photoIndex) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-choice' + (photoIndex === index ? ' active' : '');
    button.dataset.photoIndex = photoIndex;
    button.setAttribute('aria-label', 'Edit photo ' + (photoIndex + 1) + ': ' + photo.title);
    button.setAttribute('aria-pressed', String(photoIndex === index));
    const image = document.createElement('img'); image.src = photo.src; image.alt = ''; image.loading = 'lazy';
    const number = document.createElement('span'); number.textContent = photoIndex + 1;
    button.append(image, number); strip.append(button);
  });
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
  const length = content.projects[selectedProject].images.length;
  if (!length) return;
  positions.set(selectedProject, ((index % length) + length) % length);
  renderPhoto(); postPreview();
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
    if (response.status === 409) throw new Error('The published file changed during this save. Download your draft, then load the published version before editing again.');
    if (response.status === 404) throw new Error('GitHub could not open this repository with the provided access. Select Portfolio when creating the token.');
    throw new Error('GitHub could not save the file (HTTP ' + response.status + '). Your draft is still here.');
  }
  return data;
}
async function getPublished(token='') {
  const file = await request(API + '?ref=main', token);
  return {sha:file.sha, content:tools.parse(tools.decode(file.content))};
}
function matchesBaseline(published) {
  return baseSha ? published.sha === baseSha : tools.serialize(published.content) === tools.serialize(baseline);
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
qs('#projectSelect').addEventListener('change', event => { selectedProject = event.target.value; renderProject(); });
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
  if (!project.images.length) qs('#undoPhoto').focus();
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
qs('#photoStrip').addEventListener('click', event => {
  const button = event.target.closest('[data-photo-index]');
  if (button) movePhoto(Number(button.dataset.photoIndex));
});
qs('#previewFrame').addEventListener('load', postPreview);
qs('#downloadContent').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([tools.serialize(content)], {type:'text/javascript;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'content.js';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  publishStatus('Downloaded your draft. Upload this content.js to the repository to publish it.');
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
    renderProjectSelect(); renderProject(); saveDraft(); publishStatus('Loaded the published version.');
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
    const published = await getPublished(token);
    if (!matchesBaseline(published)) throw new Error('GitHub has newer changes than this draft. Download your draft, then load the published version to avoid overwriting those changes.');
    const snapshot = tools.clone(content);
    const result = await request(API, token, {method:'PUT', body:JSON.stringify({message:'Update portfolio projects, photos, and captions', content:tools.encode(tools.serialize(snapshot)), sha:published.sha, branch:'main'})});
    baseSha = result.content.sha; baseline = tools.clone(snapshot); edited = false;
    removedPhotos = {}; renderPhoto();
    saveDraft(false); status('Saved to GitHub. The public site will update when GitHub Pages finishes publishing.');
    publishStatus('Published to GitHub. ');
    const link = document.createElement('a'); link.textContent = 'View the saved change ↗';
    link.href = 'https://github.com/yienliu84/Portfolio/commit/' + result.commit.sha;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; qs('#publishStatus').append(link);
  } catch (error) { publishStatus(error.message, true); saveDraft(false); }
  finally {
    token = ''; qs('#githubToken').value = ''; qs('#githubToken').disabled = false;
    busy = false; setEnabled(true); qs('#publishButton').textContent = 'Publish to GitHub';
  }
});

async function initialize() {
  renderProjectSelect(); renderProject(); setEnabled(false);
  try {
    const published = await getPublished();
    if (draft && edited) {
      if (!matchesBaseline(published)) {
        status('Draft restored. GitHub has newer changes; download this draft before loading the published version.', true);
      } else {
        baseline = tools.clone(published.content); baseSha = published.sha;
        saveDraft();
      }
    } else {
      content = tools.clone(published.content); baseline = tools.clone(published.content); baseSha = published.sha; edited = false;
      removedPhotos = {};
      renderProjectSelect(); renderProject(); saveDraft();
    }
  } catch {
    saveDraft(false); status('Editing is available. GitHub will be checked again when you publish.');
  } finally { setEnabled(true); }
}
initialize();
})();
