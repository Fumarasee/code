import { dogPhoto, focusStyle } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { dogAge, escapeHtml, prefersReducedMotion } from '../lib/utils.js';
import { Spring } from '../lib/spring.js';

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
        <div${dog.weight ? '' : ' class="is-wide"'}><dt>Age</dt><dd>${dogAge(dog, { short: true })}</dd></div>
        ${dog.weight ? `<div><dt>Weight</dt><dd>${dog.weight} kg</dd></div>` : ''}
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

/**
 * Pointer spotlight + subtle 3D tilt for every card inside `container`.
 * Tilt and lift are springs (interruptible, no overshoot) so the card follows
 * the pointer smoothly and settles from wherever it is when the pointer
 * leaves. The spotlight tracks the pointer 1:1 on a compositor-only layer.
 */
export function attachCardEffects(container) {
  if (prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const states = new WeakMap();

  const stateFor = (card) => {
    let s = states.get(card);
    if (s) return s;
    const render = () => {
      card.style.transform = `perspective(1000px) rotateX(${s.rx.value}deg) rotateY(${s.ry.value}deg) translateY(${s.lift.value}px)`;
    };
    const settle = () => {
      if (!s.rx.isAnimating && !s.ry.isAnimating && !s.lift.isAnimating && !s.hovered) card.style.willChange = '';
    };
    s = {
      rx: new Spring(0, { response: 0.3, precision: 0.01, onUpdate: render, onRest: settle }),
      ry: new Spring(0, { response: 0.3, precision: 0.01, onUpdate: render, onRest: settle }),
      lift: new Spring(0, { response: 0.35, precision: 0.05, onUpdate: render, onRest: settle }),
      glow: card.querySelector('.dog-card__glow'),
      rect: null,
      hovered: false,
    };
    states.set(card, s);
    return s;
  };

  const onOver = (e) => {
    const card = e.target.closest('.dog-card');
    if (!card || card.contains(e.relatedTarget)) return;
    const s = stateFor(card);
    s.hovered = true;
    s.rect = card.getBoundingClientRect();
    card.style.willChange = 'transform'; // motion is imminent
    s.lift.to(-6);
  };

  const onMove = (e) => {
    const card = e.target.closest('.dog-card');
    if (!card) return;
    const s = stateFor(card);
    const r = s.rect || (s.rect = card.getBoundingClientRect());
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    s.rx.to((0.5 - py / r.height) * 6);
    s.ry.to((px / r.width - 0.5) * 8);
    if (s.glow) s.glow.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  };

  const onOut = (e) => {
    const card = e.target.closest?.('.dog-card');
    if (!card || card.contains(e.relatedTarget)) return;
    const s = stateFor(card);
    s.hovered = false;
    s.rect = null;
    s.rx.to(0);
    s.ry.to(0);
    s.lift.to(0);
  };

  container.addEventListener('pointerover', onOver);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerout', onOut);
  return () => {
    container.removeEventListener('pointerover', onOver);
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerout', onOut);
  };
}
