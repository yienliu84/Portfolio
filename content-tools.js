/* Shared editor format. Published content stays in content.js. */
window.PortfolioContentTools = (() => {
  const DRAFT_KEY = 'portfolio-photo-editor-v3';
  const clone = value => JSON.parse(JSON.stringify(value));
  const stringList = value => Array.isArray(value) && value.every(item => typeof item === 'string');

  function validate(content) {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return false;
    for (const key of ['hero', 'profile', 'projectsSection', 'projects', 'experience', 'leadership', 'skills', 'contact']) {
      if (!content[key] || typeof content[key] !== 'object') return false;
    }
    if (!Object.keys(content.projects).length || typeof content.footer !== 'string') return false;
    return Object.values(content.projects).every(project => {
      if (!project || typeof project.title !== 'string' || typeof project.summary !== 'string') return false;
      if (!stringList(project.cardMeta) || !stringList(project.cardTags)) return false;
      const detail = project.detail;
      if (!detail || !['meta', 'short', 'label', 'intro'].every(key => typeof detail[key] === 'string')) return false;
      if (!stringList(detail.bullets) || !stringList(detail.tags)) return false;
      if (!Array.isArray(project.images) || !project.images.length) return false;
      const ids = new Set();
      return project.images.every(photo => {
        if (!photo || !['id', 'src', 'alt', 'title', 'caption'].every(key => typeof photo[key] === 'string')) return false;
        if (!/^assets\/photos\/[a-z0-9-]+\.svg$/.test(photo.src) || ids.has(photo.id)) return false;
        ids.add(photo.id);
        return true;
      });
    });
  }

  function parse(source) {
    const marker = 'window.PORTFOLIO_CONTENT = ';
    const index = source.indexOf(marker);
    if (index < 0) throw new Error('This file is not in the portfolio content format.');
    const content = JSON.parse(source.slice(index + marker.length).trim().replace(/;\s*$/, ''));
    if (!validate(content)) throw new Error('The project text or photo entries are incomplete.');
    return content;
  }

  function serialize(content) {
    if (!validate(content)) throw new Error('The project text or photo entries are incomplete.');
    return '/* Project text and photo captions. Use edit.html for a visual editor. */\nwindow.PORTFOLIO_CONTENT = ' + JSON.stringify(content, null, 2) + ';\n';
  }

  function encode(source) {
    const bytes = new TextEncoder().encode(source);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function decode(encoded) {
    return new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/\s/g, '')), char => char.charCodeAt(0)));
  }

  function readDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return draft?.version === 3 && validate(draft.content) ? draft : null;
    } catch {
      return null;
    }
  }

  return {DRAFT_KEY, clone, validate, parse, serialize, encode, decode, readDraft};
})();
