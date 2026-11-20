/* Photo galleries and portfolio presentation. */
(() => {
'use strict';
const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const previewMode = new URLSearchParams(location.search).get('preview') === '1';
const tools = window.PortfolioContentTools;
const draft = previewMode ? tools.readDraft() : null;
const photoPreview = previewMode ? tools.createPhotoPreview() : null;
const photoSrc = photo => photoPreview?.src(photo.src) || photo.src;
let CONTENT = draft?.content || window.PORTFOLIO_CONTENT;
const positions = new Map();
const dialog = qs('#projectDialog');
let previousFocus = null;
function tagsHtml(tags=[]) { return tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join(''); }
function specRows(rows=[]) { return rows.map(([key,value]) => `<div class="spec-key">${esc(key)}</div><div class="spec-val">${esc(value)}</div>`).join(''); }

function specificationGroups(lines=[]) {
  const groups = [];
  let group = {heading:'', bullets:[]};
  for (const entry of lines) {
    const line = entry.trim();
    if (!line) continue;
    const heading = /^(.+):$/.exec(line);
    if (heading) {
      if (group.bullets.length) groups.push(group);
      group = {heading:heading[1].trim(), bullets:[]};
    } else {
      const bullet = line.replace(/^(?:[-*\u2022]\s+)/, '').trim();
      if (bullet) group.bullets.push(bullet);
    }
  }
  if (group.bullets.length) groups.push(group);
  return groups;
}

function pauseVideos(root=document) {
  qsa('video', root).forEach(video => video.pause());
}
function cardMediaHtml(key, photo) {
  if (photo.type === 'video') return `<video class="project-video" src="${esc(photoSrc(photo))}" controls playsinline preload="metadata" aria-label="${esc(photo.alt || photo.title)}"></video><button class="video-details" type="button" data-open-project="${esc(key)}" aria-haspopup="dialog" aria-label="Enlarge ${esc(photo.title)}">Enlarge video</button>`;
  return `<button class="photo-open" type="button" data-open-project="${esc(key)}" aria-haspopup="dialog" aria-label="Enlarge ${esc(photo.title)}"><img class="project-photo" src="${esc(photoSrc(photo))}" alt="${esc(photo.alt)}" loading="lazy" decoding="async"><span class="enlarge-hint" aria-hidden="true">Enlarge ↗</span></button>`;
}
function galleryHtml(key, project) {
  if (!project.images.length) {
    positions.set(key, 0);
    return `<div class="photo-gallery" data-gallery="${esc(key)}" role="group" aria-label="${esc(project.title)} photos and videos"><div class="project-media photo-empty"><p>No photos or videos added.</p></div></div>`;
  }
  const index = Math.min(positions.get(key) || 0, project.images.length - 1);
  const photo = project.images[index];
  positions.set(key, index);
  return `<div class="photo-gallery" data-gallery="${esc(key)}" role="group" aria-label="${esc(project.title)} photos and videos">
    <div class="project-media photo-stage${photo.type === 'video' ? ' has-video' : ''}">
      <div class="card-media">${cardMediaHtml(key, photo)}</div>
      <div class="photo-nav">
        <button type="button" data-photo-step="-1" data-photo-project="${esc(key)}" aria-label="Previous ${esc(project.title)} media"${project.images.length < 2 ? ' disabled' : ''}>←</button>
        <span data-photo-count aria-live="polite">${index + 1} / ${project.images.length}</span>
        <button type="button" data-photo-step="1" data-photo-project="${esc(key)}" aria-label="Next ${esc(project.title)} media"${project.images.length < 2 ? ' disabled' : ''}>→</button>
      </div>
    </div>
    <div class="photo-description"><strong data-photo-title>${esc(photo.title)}</strong><p data-photo-caption${photo.caption ? '' : ' hidden'}>${esc(photo.caption)}</p></div>
  </div>`;
}

function renderContent() {
  pauseVideos();
  const h = CONTENT.hero;
  qs('#heroEyebrow').textContent = h.eyebrow;
  qs('#heroName').innerHTML = `${esc(h.firstName)} <span class="outline">${esc(h.lastName)}</span>`;
  qs('#heroTagline').textContent = h.tagline;
  qs('#heroSummary').textContent = h.summary;
  qs('#metricGpa').textContent = h.gpa;
  qs('#metricGrad').textContent = h.grad;
  qs('#metricFocus').textContent = h.focus;

  const p = CONTENT.profile;
  qs('#profileEyebrow').textContent = p.eyebrow;
  qs('#profileTitle').textContent = p.title;
  qs('#profileIntro').textContent = p.intro;
  qs('#educationRows').innerHTML = specRows(p.education);
  qs('#credentialsTitle').textContent = p.credentialsTitle;
  qs('#credentialsText').textContent = p.credentialsText;
  qs('#credentialsRows').innerHTML = p.credentials.map(([name, code]) => `<div class="cert"><span>${esc(name)}</span><span>${esc(code)}</span></div>`).join('');

  const ps = CONTENT.projectsSection;
  qs('#projectsEyebrow').textContent = ps.eyebrow;
  qs('#projectsTitle').textContent = ps.title;
  qs('#projectsIntro').textContent = ps.intro;
  qs('#projectGrid').innerHTML = Object.entries(CONTENT.projects).map(([key, p]) => `
    <article class="project" data-project="${esc(key)}">
      ${galleryHtml(key, p)}
      <div class="project-body">
        <div class="project-meta"><span>${esc(p.cardMeta[0] || '')}</span><span>${esc(p.cardMeta[1] || '')}</span></div>
        <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="tags">${tagsHtml(p.cardTags)}</div>
        <button class="detail-button" type="button" data-open-project="${esc(key)}" aria-haspopup="dialog" aria-label="Open ${esc(p.title)} details">View engineering details <span aria-hidden="true">↗</span></button>
      </div>
    </article>`).join('');
  const ex = CONTENT.experience;
  qs('#experienceEyebrow').textContent = ex.eyebrow;
  qs('#experienceTitle').textContent = ex.title;
  qs('#experienceIntro').textContent = ex.intro;
  qs('#experienceItems').innerHTML = ex.items.map(([time,title,org,text]) => `
    <article class="timeline-item"><div class="time">${esc(time)}</div><h3>${esc(title)}</h3><div class="org">${esc(org)}</div><p>${esc(text)}</p></article>`).join('');
  qs('#interfaceRows').innerHTML = specRows(ex.interface);

  const lead = CONTENT.leadership;
  qs('#leadershipEyebrow').textContent = lead.eyebrow;
  qs('#leadershipTitle').textContent = lead.title;
  qs('#leadershipIntro').textContent = lead.intro;
  qs('#leadershipItems').innerHTML = lead.items.map(([role,title,text]) => `
    <article class="lead-card reveal"><div class="role">${esc(role)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');

  const skills = CONTENT.skills;
  qs('#skillsEyebrow').textContent = skills.eyebrow;
  qs('#skillsTitle').textContent = skills.title;
  qs('#skillsIntro').textContent = skills.intro;
  qs('#skillGroups').innerHTML = skills.groups.map(([title,items]) => `
    <article class="skill-group reveal"><h3>${esc(title)}</h3><div class="skill-cloud">${items.map(x=>`<span class="skill">${esc(x)}</span>`).join('')}</div></article>`).join('');

  const c = CONTENT.contact;
  qs('#contactEyebrow').textContent = c.eyebrow;
  qs('#contactTitle').textContent = c.title;
  qs('#contactIntro').textContent = c.intro;
  qs('#contactButton').textContent = c.button;
  qs('#contactButton').href = `mailto:${c.email}`;
  qs('#contactEmail').textContent = `EMAIL // ${c.email}`;
  qs('#contactEmail').href = `mailto:${c.email}`;
  qs('#contactPhone').textContent = `PHONE // ${c.phone}`;
  qs('#contactPhone').href = `tel:${c.phone.replace(/[^+\d]/g,'')}`;
  qs('#contactLinkedin').textContent = `LINKEDIN // ${c.linkedinLabel} ↗`;
  qs('#contactLinkedin').href = c.linkedinUrl;
  qs('#footerCopy').textContent = CONTENT.footer;
}



function setPhoto(key, requestedIndex) {
  const project = CONTENT.projects[key];
  if (!project || !project.images.length) return;
  const index = ((requestedIndex % project.images.length) + project.images.length) % project.images.length;
  positions.set(key, index);
  const photo = project.images[index];
  const gallery = qsa('[data-gallery]').find(item => item.dataset.gallery === key);
  if (gallery) {
    pauseVideos(gallery);
    qs('.photo-stage', gallery).classList.toggle('has-video', photo.type === 'video');
    qs('.card-media', gallery).innerHTML = cardMediaHtml(key, photo);
    qs('[data-photo-title]', gallery).textContent = photo.title;
    const caption = qs('[data-photo-caption]', gallery);
    caption.textContent = photo.caption; caption.hidden = !photo.caption;
    qs('[data-photo-count]', gallery).textContent = (index + 1) + ' / ' + project.images.length;
  }
  if (dialog.open && dialog.dataset.project === key) updateModalPhoto(key);
}
function updateModalPhoto(key) {
  const project = CONTENT.projects[key];
  const index = Math.max(0, Math.min(positions.get(key) || 0, project.images.length - 1));
  const photo = project.images[index];
  positions.set(key, index);
  const image = qs('#modalMainImage');
  const video = qs('#modalMainVideo');
  video.pause(); video.removeAttribute('src'); video.load();
  image.hidden = !photo || photo.type === 'video';
  video.hidden = photo?.type !== 'video';
  if (photo?.type === 'video') {
    video.src = photoSrc(photo); video.setAttribute('aria-label', photo.alt || photo.title);
    image.removeAttribute('src');
  } else if (photo) { image.src = photoSrc(photo); image.alt = photo.alt; }
  else { image.removeAttribute('src'); image.alt = ''; }
  let empty = qs('.photo-empty-message', qs('.modal-photo-stage'));
  if (!empty) {
    empty = document.createElement('p'); empty.className = 'photo-empty-message';
    empty.textContent = 'No photos or videos added.'; qs('.modal-photo-stage').append(empty);
  }
  empty.hidden = Boolean(photo);
  qs('#modalPhotoTitle').textContent = photo?.title || 'Project media';
  qs('#modalCaption').textContent = photo?.caption || ''; qs('#modalCaption').hidden = !photo?.caption;
  qs('#modalPhotoCount').textContent = (photo ? index + 1 : 0) + ' / ' + project.images.length;
  qsa('[data-modal-step]').forEach(button => button.disabled = project.images.length < 2);
  qsa('[data-photo-index]', qs('#thumbRow')).forEach((button, i) => {
    button.classList.toggle('active', i === index); button.setAttribute('aria-pressed', String(i === index));
  });
}
function openProject(key, trigger) {
  const project = CONTENT.projects[key];
  if (!project) return;
  pauseVideos();
  const detail = project.detail;
  if (!dialog.open) previousFocus = trigger || document.activeElement;
  dialog.dataset.project = key;
  qs('#modalMeta').textContent = detail.meta; qs('#modalShort').textContent = detail.short;
  qs('#modalLabel').textContent = detail.label; qs('#modalTitle').textContent = project.title;
  qs('#modalIntro').textContent = detail.intro;
  qs('#modalList').innerHTML = detail.bullets.map(item => `<li>${esc(item)}</li>`).join('');
  const specifications = specificationGroups(detail.specifications);
  qs('#modalSpecifications').hidden = specifications.length === 0;
  qs('#modalSpecificationsList').innerHTML = specifications.map(group => `<div class="specification-group">${group.heading ? `<h4>${esc(group.heading)}</h4>` : ''}<ul class="detail-list">${group.bullets.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('');
  qs('#modalTags').innerHTML = tagsHtml(detail.tags);
  qs('#thumbRow').innerHTML = project.images.map((photo, i) => `<button type="button" class="photo-thumb" data-photo-index="${i}" data-photo-project="${esc(key)}" aria-label="Show ${photo.type === 'video' ? 'video' : 'photo'} ${i + 1}: ${esc(photo.title)}" aria-pressed="false">${photo.type === 'video' ? '<span class="video-thumbnail">▶ Video</span>' : `<img src="${esc(photoSrc(photo))}" alt="" loading="lazy" decoding="async">`}<span>${i + 1}</span></button>`).join('');
  qsa('[data-modal-step]').forEach(button => button.dataset.photoProject = key);
  if (!dialog.open) {
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  updateModalPhoto(key); document.body.style.overflow = 'hidden';
}
function closeProject() { dialog.close(); }
function initInteractions() {
  document.addEventListener('play', event => {
    if (event.target.tagName === 'VIDEO') qsa('video').forEach(video => { if (video !== event.target) video.pause(); });
  }, true);
  document.addEventListener('click', event => {
    const open = event.target.closest('[data-open-project]');
    if (open) { openProject(open.dataset.openProject, open); return; }
    const step = event.target.closest('[data-photo-step], [data-modal-step]');
    if (step) { const key = step.dataset.photoProject; setPhoto(key, (positions.get(key) || 0) + Number(step.dataset.photoStep || step.dataset.modalStep)); return; }
    const thumb = event.target.closest('[data-photo-index]');
    if (thumb) { setPhoto(thumb.dataset.photoProject, Number(thumb.dataset.photoIndex)); return; }
    const card = event.target.closest('.project[data-project]');
    if (!card || event.target.closest('a, button, video')) return;
    const selection = window.getSelection();
    if (selection?.type === 'Range' && card.contains(selection.anchorNode)) return;
    openProject(card.dataset.project, qs('.detail-button', card));
  });
  qs('#closeDialog').addEventListener('click', closeProject);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeProject(); });
  dialog.addEventListener('close', () => { pauseVideos(dialog); document.body.style.overflow = ''; if (previousFocus?.isConnected) previousFocus.focus(); });
  dialog.addEventListener('keydown', event => {
    if (event.target.closest('video, input, textarea, select') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const key = dialog.dataset.project;
    setPhoto(key, (positions.get(key) || 0) + (event.key === 'ArrowRight' ? 1 : -1));
  });
  const menuBtn = qs('#menuBtn'), navLinks = qs('#navLinks');
  menuBtn.addEventListener('click', () => { const open = navLinks.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? '×' : '☰'; });
  qsa('a', navLinks).forEach(anchor => anchor.addEventListener('click', () => { navLinks.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = '☰'; }));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } }), {threshold: .1});
    qsa('.reveal:not(.visible)').forEach(element => revealObserver.observe(element));
    const sections = qsa('main section[id]'), nav = qsa('.nav-links a');
    const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) nav.forEach(anchor => anchor.classList.toggle('active', anchor.getAttribute('href') === '#' + entry.target.id)); }), {rootMargin: '-35% 0px -55% 0px'});
    sections.forEach(section => sectionObserver.observe(section));
  } else qsa('.reveal').forEach(element => element.classList.add('visible'));
}
renderContent(); qs('#year').textContent = new Date().getFullYear(); initInteractions();
if (previewMode) {
  const banner = document.createElement('div'); banner.className = 'preview-banner';
  banner.textContent = 'Draft preview — changes are not published yet'; document.body.prepend(banner);
  let updateNumber = 0;
  async function updatePreview({content, stagedPaths, project, photoIndex}) {
    const update = ++updateNumber;
    const paths = new Set(stagedPaths || []);
    if (paths.size) {
      const images = Object.values(content.projects).flatMap(project => project.images);
      await photoPreview.load(images.map(photo => photo.src).filter(path => paths.has(path))).catch(() => {});
    }
    if (update !== updateNumber) return;
    CONTENT = content;
    renderContent();
    if (project && CONTENT.projects[project]) setPhoto(project, photoIndex || 0);
    if (dialog.open) openProject(dialog.dataset.project);
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'portfolio-preview') return;
    if (!tools.validate(event.data.content)) return;
    updatePreview(event.data);
  });
  if (draft?.stagedPaths?.length) updatePreview(draft);
}
})();
