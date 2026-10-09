/* Photo galleries and portfolio presentation. */
(() => {
'use strict';
const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const previewMode = new URLSearchParams(location.search).get('preview') === '1';
const draft = previewMode ? window.PortfolioContentTools.readDraft() : null;
let CONTENT = draft?.content || window.PORTFOLIO_CONTENT;
const positions = new Map();
const dialog = qs('#projectDialog');
let previousFocus = null;
function tagsHtml(tags=[]) { return tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join(''); }
function specRows(rows=[]) { return rows.map(([key,value]) => `<div class="spec-key">${esc(key)}</div><div class="spec-val">${esc(value)}</div>`).join(''); }

function galleryHtml(key, project) {
  const index = Math.min(positions.get(key) || 0, project.images.length - 1);
  const photo = project.images[index];
  positions.set(key, index);
  return `<div class="photo-gallery" data-gallery="${esc(key)}" role="group" aria-label="${esc(project.title)} photos">
    <div class="project-media photo-stage">
      <button class="photo-open" type="button" data-open-project="${esc(key)}" aria-label="Enlarge ${esc(photo.title)}">
        <img class="project-photo" src="${esc(photo.src)}" alt="${esc(photo.alt)}" loading="lazy" decoding="async">
        <span class="enlarge-hint" aria-hidden="true">Enlarge ↗</span>
      </button>
      <div class="photo-nav">
        <button type="button" data-photo-step="-1" data-photo-project="${esc(key)}" aria-label="Previous ${esc(project.title)} photo">←</button>
        <span data-photo-count aria-live="polite">${index + 1} / ${project.images.length}</span>
        <button type="button" data-photo-step="1" data-photo-project="${esc(key)}" aria-label="Next ${esc(project.title)} photo">→</button>
      </div>
    </div>
    <div class="photo-description"><strong data-photo-title>${esc(photo.title)}</strong><p data-photo-caption${photo.caption ? '' : ' hidden'}>${esc(photo.caption)}</p></div>
  </div>`;
}

function renderContent() {
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
    <article class="project ${esc(p.cardClass || '')}" data-project="${esc(key)}">
      ${galleryHtml(key, p)}
      <div class="project-body">
        <div class="project-meta"><span>${esc(p.cardMeta[0] || '')}</span><span>${esc(p.cardMeta[1] || '')}</span></div>
        <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="tags">${tagsHtml(p.cardTags)}</div>
        <button class="detail-button" type="button" data-open-project="${esc(key)}" aria-label="Open ${esc(p.title)} details">View engineering details <span aria-hidden="true">↗</span></button>
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
  if (!project) return;
  const index = ((requestedIndex % project.images.length) + project.images.length) % project.images.length;
  positions.set(key, index);
  const photo = project.images[index];
  const gallery = qsa('[data-gallery]').find(item => item.dataset.gallery === key);
  if (gallery) {
    qs('.project-photo', gallery).src = photo.src; qs('.project-photo', gallery).alt = photo.alt;
    qs('.photo-open', gallery).setAttribute('aria-label', 'Enlarge ' + photo.title);
    qs('[data-photo-title]', gallery).textContent = photo.title;
    const caption = qs('[data-photo-caption]', gallery);
    caption.textContent = photo.caption; caption.hidden = !photo.caption;
    qs('[data-photo-count]', gallery).textContent = (index + 1) + ' / ' + project.images.length;
  }
  if (dialog.open && dialog.dataset.project === key) updateModalPhoto(key);
}
function updateModalPhoto(key) {
  const project = CONTENT.projects[key], index = positions.get(key) || 0, photo = project.images[index];
  qs('#modalMainImage').src = photo.src; qs('#modalMainImage').alt = photo.alt;
  qs('#modalPhotoTitle').textContent = photo.title;
  qs('#modalCaption').textContent = photo.caption; qs('#modalCaption').hidden = !photo.caption;
  qs('#modalPhotoCount').textContent = (index + 1) + ' / ' + project.images.length;
  qsa('[data-photo-index]', qs('#thumbRow')).forEach((button, i) => {
    button.classList.toggle('active', i === index); button.setAttribute('aria-pressed', String(i === index));
  });
}
function openProject(key) {
  const project = CONTENT.projects[key];
  if (!project) return;
  const detail = project.detail;
  if (!dialog.open) previousFocus = document.activeElement;
  dialog.dataset.project = key;
  qs('#modalMeta').textContent = detail.meta; qs('#modalShort').textContent = detail.short;
  qs('#modalLabel').textContent = detail.label; qs('#modalTitle').textContent = project.title;
  qs('#modalIntro').textContent = detail.intro;
  qs('#modalList').innerHTML = detail.bullets.map(item => `<li>${esc(item)}</li>`).join('');
  qs('#modalTags').innerHTML = tagsHtml(detail.tags);
  qs('#thumbRow').innerHTML = project.images.map((photo, i) => `<button type="button" class="photo-thumb" data-photo-index="${i}" data-photo-project="${esc(key)}" aria-label="Show photo ${i + 1}: ${esc(photo.title)}" aria-pressed="false"><img src="${esc(photo.src)}" alt="" loading="lazy" decoding="async"><span>${i + 1}</span></button>`).join('');
  qsa('[data-modal-step]').forEach(button => button.dataset.photoProject = key);
  if (!dialog.open) dialog.showModal();
  updateModalPhoto(key); document.body.style.overflow = 'hidden';
}
function closeProject() { dialog.close(); }
function initInteractions() {
  document.addEventListener('click', event => {
    const open = event.target.closest('[data-open-project]');
    if (open) { openProject(open.dataset.openProject); return; }
    const step = event.target.closest('[data-photo-step], [data-modal-step]');
    if (step) { const key = step.dataset.photoProject; setPhoto(key, (positions.get(key) || 0) + Number(step.dataset.photoStep || step.dataset.modalStep)); return; }
    const thumb = event.target.closest('[data-photo-index]');
    if (thumb) setPhoto(thumb.dataset.photoProject, Number(thumb.dataset.photoIndex));
  });
  qs('#closeDialog').addEventListener('click', closeProject);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeProject(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; if (previousFocus?.isConnected) previousFocus.focus(); });
  dialog.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
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
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'portfolio-preview') return;
    if (!window.PortfolioContentTools.validate(event.data.content)) return;
    CONTENT = event.data.content; renderContent();
    if (event.data.project && CONTENT.projects[event.data.project]) setPhoto(event.data.project, event.data.photoIndex || 0);
    if (dialog.open) openProject(dialog.dataset.project);
  });
}
})();
