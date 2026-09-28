import { dogPhoto, focusStyle } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { escapeHtml, formatAge, prefersReducedMotion } from '../lib/utils.js';

export const genderIcon = (gender) =>
  `<span class="gender gender--${gender}" title="${gender === 'male' ? 'Boy' : 'Girl'}">${icon(gender)}</span>`;

export const coatSwatch = (dog) =>
  `<span class="swatch" style="--c1:${dog.coat.primary};--c2:${dog.coat.secondary}" aria-hidden="true"></span>`;

export const eyeSwatch = (dog) =>
  `<span class="swatch swatch--eye" style="--c1:${dog.eyes.left};--c2:${dog.eyes.right}" aria-hidden="true"></span>`;

export const shortEyes = (dog) => dog.eyes.label.split(' — ')[0];

export function statusClass(status) {
  if (/home/i.test(status)) return 'status--home';
  if (/puppy/i.test(status)) return 'status--puppy';
  if (/senior/i.test(status)) return 'status--senior';
  if (/sled/i.test(status)) return 'status--sled';
  return 'status--resident';
}

export function dogCard(dog, i = 0) {
  const cover = dogPhoto(dog, 0);
  const name = escapeHtml(dog.name);
  return `
  <article class="dog-card glass" data-id="${dog.id}"
    style="--i:${i};--accent-1:${dog.accent[0]};--accent-2:${dog.accent[1]}">
    <div class="dog-card__glow" aria-hidden="true"></div>
    <div class="dog-card__media">
      <img src="${cover.src}" style="${focusStyle(cover)}" alt="${name}, ${escapeHtml(dog.coat.color.toLowerCase())} husky" loading="lazy" decoding="async" />
      <span class="status ${statusClass(dog.status)}">${escapeHtml(dog.status)}</span>
      <button type="button" class="dog-card__gallery" data-gallery="${dog.id}"
        aria-label="Open ${name}’s gallery, ${dog.photos.length} photos">
        ${icon('images')}<span>${dog.photos.length}</span>
      </button>
    </div>
    <div class="dog-card__body">
      <div class="dog-card__head">
        <h3 class="dog-card__name"><a href="#/dog/${dog.id}" class="dog-card__link">${name}</a></h3>
        ${genderIcon(dog.gender)}
      </div>
      <p class="dog-card__tagline">${escapeHtml(dog.tagline)}</p>
      <dl class="dog-card__specs">
        <div><dt>Age</dt><dd>${formatAge(dog.birthDate, { short: true })}</dd></div>
        <div><dt>Weight</dt><dd>${dog.weight} kg</dd></div>
        <div class="is-wide"><dt>Coat</dt><dd>${coatSwatch(dog)}${escapeHtml(dog.coat.color)}</dd></div>
        <div class="is-wide"><dt>Eyes</dt><dd>${eyeSwatch(dog)}${escapeHtml(shortEyes(dog))}</dd></div>
      </dl>
      <div class="dog-card__foot">
        <span class="chip chip--soft">${escapeHtml(dog.temper)}</span>
        <span class="dog-card__cta">Profile ${icon('arrowRight')}</span>
      </div>
    </div>
  </article>`;
}

/** Pointer spotlight + subtle 3D tilt for every card inside `container`. */
export function attachCardEffects(container) {
  if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return () => {};
  let raf = 0;
  const onMove = (e) => {
    const card = e.target.closest('.dog-card');
    if (!card) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
    });
  };
  const onLeave = (e) => {
    const card = e.target.closest?.('.dog-card');
    if (!card || card.contains(e.relatedTarget)) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerout', onLeave);
  return () => {
    cancelAnimationFrame(raf);
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerout', onLeave);
  };
}
