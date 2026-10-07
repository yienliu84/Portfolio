import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { inflate } from 'https://cdn.jsdelivr.net/npm/pako@2.1.0/+esm';

const CONTENT = window.PORTFOLIO_CONTENT;
const MODEL_PARTS = window.PORTFOLIO_MODEL_PARTS || {};
const MODEL_DATA_V2 = window.PORTFOLIO_MODEL_DATA_V2 || {};
const MODEL_KEYS = {
  manta: 'manta',
  merv: 'merv-unit',
  rover: 'rover',
  ivo: 'ivo',
  mocap: 'mocap'
};
const MERV_MODELS = [
  { key: 'merv-unit', label: 'Full Unit' },
  { key: 'merv-gearbox', label: 'Gear Box Assembly' },
  { key: 'merv-driveshaft', label: 'Drive Shaft Assembly' },
  { key: 'merv-tread', label: 'Tread Link' }
];
const VIEW_PRESETS = {
  manta: [1.18, 0.52, 1.38],
  rover: [1.05, 0.76, 1.28],
  'merv-unit': [1.16, 0.72, 1.12],
  'merv-gearbox': [1.18, 0.82, 1.08],
  'merv-driveshaft': [1.38, 0.64, 0.96],
  'merv-tread': [1.12, 0.66, 1.30],
  ivo: [1.15, 0.40, 1.35],
  mocap: [1.18, 0.82, 1.22]
};
const viewerInstances = new Set();
const modelCache = new Map();

const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = (value='') => String(value)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#039;');

function tagsHtml(tags=[]) {
  return tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('');
}

function specRows(rows=[]) {
  return rows.map(([key,value]) => `<div class="spec-key">${esc(key)}</div><div class="spec-val">${esc(value)}</div>`).join('');
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
  qs('#projectGrid').innerHTML = Object.entries(CONTENT.projects).map(([key, project]) => `
    <article class="project ${esc(project.cardClass || '')}" data-project="${esc(key)}">
      <div class="project-media">
        <div class="model-viewer" data-model="${esc(key)}" aria-label="${esc(project.modelLabel)}">
          <div class="viewer-loading">Loading 3D model…</div>
        </div>
        <div class="viewer-hint" aria-hidden="true">drag to rotate · scroll to zoom</div>
      </div>
      <div class="project-body">
        <div class="project-meta"><span>${esc(project.cardMeta?.[0] || '')}</span><span>${esc(project.cardMeta?.[1] || '')}</span></div>
        <h3>${esc(project.title)}</h3>
        <p>${esc(project.summary)}</p>
        <div class="tags">${tagsHtml(project.cardTags)}</div>
        <button class="detail-button" type="button" data-open-project="${esc(key)}" aria-label="Open ${esc(project.title)} details">View engineering details <span aria-hidden="true">↗</span></button>
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

function decodeMeshes(key) {
  if (modelCache.has(key)) return modelCache.get(key);
  const encoded = MODEL_DATA_V2[key] || (MODEL_PARTS[key] || []).join('');
  if (!encoded) throw new Error(`Missing model data for ${key}`);
  const compressed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const raw = inflate(compressed);
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let offset = 0;
  const meshCount = dv.getUint16(offset, true); offset += 2;
  const geometries = [];

  for (let meshIndex=0; meshIndex<meshCount; meshIndex++) {
    const vertexCount = dv.getUint32(offset, true); offset += 4;
    const triangleCount = dv.getUint32(offset, true); offset += 4;
    const min = [dv.getFloat32(offset,true), dv.getFloat32(offset+4,true), dv.getFloat32(offset+8,true)]; offset += 12;
    const scale = [dv.getFloat32(offset,true), dv.getFloat32(offset+4,true), dv.getFloat32(offset+8,true)]; offset += 12;
    const positions = new Float32Array(vertexCount * 3);
    for (let i=0; i<vertexCount; i++) {
      positions[i*3] = min[0] + dv.getUint16(offset,true) * scale[0]; offset += 2;
      positions[i*3+1] = min[1] + dv.getUint16(offset,true) * scale[1]; offset += 2;
      positions[i*3+2] = min[2] + dv.getUint16(offset,true) * scale[2]; offset += 2;
    }
    const indexCount = triangleCount * 3;
    const indices = new Uint16Array(indexCount);
    for (let i=0; i<indexCount; i++) { indices[i] = dv.getUint16(offset,true); offset += 2; }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometries.push(geometry);
  }
  if (offset !== raw.byteLength) throw new Error(`Model ${key} did not parse cleanly (${offset}/${raw.byteLength})`);
  modelCache.set(key, geometries);
  return geometries;
}

function makeMaterial(index) {
  const palette = [0xc5cbd1, 0x8d969f, 0xff7a18, 0x5f6872, 0xdfe3e7];
  return new THREE.MeshStandardMaterial({
    color: palette[index % palette.length],
    roughness: 0.58,
    metalness: 0.18,
    side: THREE.DoubleSide
  });
}

function disposeViewer(viewer) {
  if (!viewer || viewer.disposed) return;
  viewer.disposed = true;
  cancelAnimationFrame(viewer.raf);
  viewer.resizeObserver?.disconnect();
  viewer.controls?.dispose();
  viewer.renderer?.dispose();
  viewerInstances.delete(viewer);
}

function destroyViewer(viewer) {
  if (!viewer) return;
  if (typeof viewer.disposeAll === 'function') viewer.disposeAll();
  else disposeViewer(viewer);
}

function createViewer(host, key, {modal=false}={}) {
  if (host.dataset.ready === 'true') return host._viewer;
  host.dataset.ready = 'true';
  host.innerHTML = '';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100000);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.autoRotate = !modal && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.7;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x171d24, 2.4);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0); keyLight.position.set(3,4,5); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffb06b, 1.35); fillLight.position.set(-4,1,-3); scene.add(fillLight);

  const group = new THREE.Group(); scene.add(group);
  const geometries = decodeMeshes(key);
  geometries.forEach((geometry,i) => group.add(new THREE.Mesh(geometry, makeMaterial(i))));

  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x,size.y,size.z) || 1;
  const distance = radius / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov/2))) * 1.28;
  const preset = VIEW_PRESETS[key] || [1.15, 0.72, 1.35];
  const viewDir = new THREE.Vector3(...preset).normalize();
  camera.position.copy(viewDir.multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.001);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.target.set(0,0,0);
  controls.minDistance = distance * 0.32;
  controls.maxDistance = distance * 4.2;
  controls.update();
  const initialPosition = camera.position.clone();

  const toolbar = document.createElement('div');
  toolbar.className = 'viewer-toolbar';
  const reset = document.createElement('button'); reset.type='button'; reset.className='viewer-reset'; reset.textContent='Reset'; reset.setAttribute('aria-label','Reset 3D view');
  toolbar.appendChild(reset); host.appendChild(toolbar);
  reset.addEventListener('click', e => {
    e.stopPropagation(); controls.autoRotate=false; camera.position.copy(initialPosition); controls.target.set(0,0,0); controls.update();
  });
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
  };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();

  const viewer = { host, renderer, controls, resizeObserver, raf:0, disposed:false };
  viewerInstances.add(viewer); host._viewer = viewer;
  const animate = () => {
    if (viewer.disposed) return;
    controls.update(); renderer.render(scene,camera); viewer.raf=requestAnimationFrame(animate);
  };
  animate();
  return viewer;
}

function createMervViewer(host, {modal=false}={}) {
  let index = 0;
  let currentViewer = null;
  let disposed = false;

  const render = () => {
    if (disposed) return;
    if (currentViewer) disposeViewer(currentViewer);
    host.dataset.ready = 'false';
    host.innerHTML = '';
    const item = MERV_MODELS[index];
    currentViewer = createViewer(host, item.key, {modal});

    const switcher = document.createElement('div');
    switcher.className = 'model-switcher';
    switcher.innerHTML = `
      <button type="button" data-model-prev aria-label="Previous MERV model">←</button>
      <span><small>MERV model</small><strong>${esc(item.label)}</strong></span>
      <button type="button" data-model-next aria-label="Next MERV model">→</button>`;
    host.appendChild(switcher);

    switcher.querySelector('[data-model-prev]').addEventListener('click', e => {
      e.stopPropagation();
      index = (index + MERV_MODELS.length - 1) % MERV_MODELS.length;
      render();
    });
    switcher.querySelector('[data-model-next]').addEventListener('click', e => {
      e.stopPropagation();
      index = (index + 1) % MERV_MODELS.length;
      render();
    });
  };

  render();
  return {
    disposeAll() {
      if (disposed) return;
      disposed = true;
      disposeViewer(currentViewer);
      currentViewer = null;
      host.innerHTML = '';
      host.dataset.ready = 'false';
    }
  };
}

function mountProjectViewer(host, projectKey, {modal=false}={}) {
  if (projectKey === 'merv') return createMervViewer(host, {modal});
  return createViewer(host, MODEL_KEYS[projectKey] || projectKey, {modal});
}

function initProjectViewers() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const host = entry.target;
      try { mountProjectViewer(host, host.dataset.model); }
      catch (err) { console.error(err); host.innerHTML = '<div class="viewer-error">3D preview unavailable</div>'; }
      observer.unobserve(host);
    });
  }, { rootMargin:'240px 0px' });
  qsa('.model-viewer[data-model]').forEach(el => observer.observe(el));
}

const dialog = qs('#projectDialog');
let modalViewer = null;
function openProject(key) {
  const p = CONTENT.projects[key];
  if (!p) return;
  const d = p.detail;
  qs('#modalMeta').textContent = d.meta;
  qs('#modalShort').textContent = d.short;
  qs('#modalLabel').textContent = d.label;
  qs('#modalTitle').textContent = p.title;
  qs('#modalIntro').textContent = d.intro;
  qs('#modalList').innerHTML = d.bullets.map(x=>`<li>${esc(x)}</li>`).join('');
  qs('#modalTags').innerHTML = tagsHtml(d.tags);
  const modalHost = qs('#modalViewer');
  destroyViewer(modalViewer); modalViewer = null; modalHost.dataset.ready='false'; modalHost.innerHTML='<div class="viewer-loading">Loading 3D model…</div>';
  dialog.showModal(); document.body.style.overflow='hidden';
  requestAnimationFrame(() => {
    try { modalViewer = mountProjectViewer(modalHost, key, {modal:true}); }
    catch (err) { console.error(err); modalHost.innerHTML='<div class="viewer-error">3D preview unavailable</div>'; }
  });
}
function closeProject(){ destroyViewer(modalViewer); modalViewer=null; dialog.close(); document.body.style.overflow=''; }

function initInteractions() {
  qsa('[data-open-project]').forEach(btn => btn.addEventListener('click', () => openProject(btn.dataset.openProject)));
  qs('#closeDialog').addEventListener('click', closeProject);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeProject(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeProject(); });

  const menuBtn=qs('#menuBtn'), navLinks=qs('#navLinks');
  menuBtn.addEventListener('click',()=>{const open=navLinks.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));menuBtn.textContent=open?'×':'☰';});
  qsa('a',navLinks).forEach(a=>a.addEventListener('click',()=>{navLinks.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');menuBtn.textContent='☰';}));

  const revealObs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObs.unobserve(e.target);}}),{threshold:.1});
  qsa('.reveal:not(.visible)').forEach(el=>revealObs.observe(el));
  const sections=qsa('main section[id]'), nav=qsa('.nav-links a');
  const secObs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)nav.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-35% 0px -55% 0px'});
  sections.forEach(s=>secObs.observe(s));
}

renderContent();
qs('#year').textContent = new Date().getFullYear();
initProjectViewers();
initInteractions();

window.addEventListener('pagehide', () => viewerInstances.forEach(disposeViewer));