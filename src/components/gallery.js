/**
 * Floating gallery overlay. Opens over the current page for any dog:
 *   openGallery(dog, startIndex, { showProfileLink })
 * Keyboard: ← → to browse, Home/End, Esc to close. Drag/swipe also works.
 */
import { dogPhotos } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { escapeHtml, prefersReducedMotion } from '../lib/utils.js';

let active = null;

export const isGalleryOpen = () => Boolean(active);

export function openGallery(dog, startIndex = 0, { showProfileLink = true } = {}) {
  if (active) closeGallery({ instant: true });

  const photos = dogPhotos(dog);
  const root = document.getElementById('gallery-root');
  const el = document.createElement('div');
  el.className = 'gallery';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'gallery-title');
  el.style.setProperty('--accent-1', dog.accent[0]);
  el.style.setProperty('--accent-2', dog.accent[1]);

  el.innerHTML = `
    <div class="gallery__backdrop" data-close></div>
    <div class="gallery__panel glass glass--strong">
      <header class="gallery__head">
        <div class="gallery__title">
          <img class="gallery__avatar" src="${photos[0].src}" alt="" />
          <div>
            <h2 id="gallery-title">${escapeHtml(dog.name)}’s gallery</h2>
            <p class="gallery__counter" aria-live="polite"></p>
          </div>
        </div>
        <div class="gallery__actions">
          ${showProfileLink ? `<a class="btn btn--ghost btn--sm" href="#/dog/${dog.id}">${icon('paw')}<span>Open profile</span></a>` : ''}
          <button type="button" class="icon-btn" data-close aria-label="Close gallery">${icon('close')}</button>
        </div>
      </header>
      <div class="gallery__stage">
        <div class="gallery__ambient" aria-hidden="true"></div>
        <button type="button" class="gallery__nav gallery__nav--prev" data-step="-1" aria-label="Previous photo">${icon('chevronLeft')}</button>
        <figure class="gallery__figure">
          <div class="gallery__frame"></div>
          <figcaption class="gallery__caption"></figcaption>
        </figure>
        <button type="button" class="gallery__nav gallery__nav--next" data-step="1" aria-label="Next photo">${icon('chevronRight')}</button>
      </div>
      <div class="gallery__thumbs" role="tablist" aria-label="Photos">
        ${photos
          .map(
            (p, i) => `
          <button type="button" class="gallery__thumb" role="tab" data-index="${i}" aria-label="Photo ${i + 1}: ${escapeHtml(p.caption)}">
            <img src="${p.src}" alt="" loading="lazy" decoding="async" />
          </button>`,
          )
          .join('')}
      </div>
    </div>`;

  root.appendChild(el);
  document.documentElement.classList.add('is-locked');

  const frame = el.querySelector('.gallery__frame');
  const caption = el.querySelector('.gallery__caption');
  const counter = el.querySelector('.gallery__counter');
  const ambient = el.querySelector('.gallery__ambient');
  const thumbs = [...el.querySelectorAll('.gallery__thumb')];
  const reduced = prefersReducedMotion();
  let index = -1;

  /** Scales an image to the largest size that fits the frame, keeping its ratio. */
  function fit(img) {
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0.8;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const w = Math.min(fw, fh * ratio);
    img.style.width = `${Math.round(w)}px`;
    img.style.height = `${Math.round(w / ratio)}px`;
  }
  const onResize = () => frame.querySelectorAll('.gallery__img').forEach(fit);

  function show(next, dir = 1) {
    next = (next + photos.length) % photos.length;
    if (next === index) return;
    const photo = photos[next];
    const img = document.createElement('img');
    img.className = 'gallery__img';
    img.alt = `${dog.name}: ${photo.caption}`;
    img.style.opacity = '0';
    img.src = photo.src;

    const old = frame.querySelector('.gallery__img:not(.is-leaving)');
    frame.appendChild(img);
    if (old) {
      old.classList.add('is-leaving');
      if (reduced) old.remove();
      else {
        const out = old.animate(
          [
            { opacity: 1, transform: 'translateX(0) scale(1)' },
            { opacity: 0, transform: `translateX(${-dir * 70}px) scale(.96)` },
          ],
          { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' },
        );
        out.onfinish = () => old.remove();
      }
    }

    const ready = img.decode ? img.decode() : Promise.resolve();
    ready
      .catch(() => {})
      .then(() => {
        if (!img.isConnected) return;
        fit(img);
        img.style.opacity = '';
        if (!reduced) {
          img.animate(
            [
              { opacity: 0, transform: `translateX(${dir * 70}px) scale(.96)` },
              { opacity: 1, transform: 'translateX(0) scale(1)' },
            ],
            { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' },
          );
        }
      });

    index = next;
    caption.textContent = photo.caption;
    counter.textContent = `Photo ${index + 1} of ${photos.length}`;
    ambient.style.backgroundImage = `url("${photo.src}")`;
    thumbs.forEach((t, i) => {
      const on = i === index;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }

  // Events
  const onClick = (e) => {
    if (e.target.closest('[data-close]')) return closeGallery();
    const step = e.target.closest('[data-step]');
    if (step) return show(index + Number(step.dataset.step), Number(step.dataset.step));
    const thumb = e.target.closest('[data-index]');
    if (thumb) {
      const i = Number(thumb.dataset.index);
      show(i, i > index ? 1 : -1);
      return;
    }
    if (e.target.closest('a[href]')) closeGallery({ instant: true });
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeGallery();
    } else if (e.key === 'ArrowRight') {
      show(index + 1, 1);
    } else if (e.key === 'ArrowLeft') {
      show(index - 1, -1);
    } else if (e.key === 'Home') {
      show(0, -1);
    } else if (e.key === 'End') {
      show(photos.length - 1, 1);
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog
      const focusables = [...el.querySelectorAll('button, a[href]')].filter((n) => n.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Drag / swipe to browse
  let dragX = null;
  const stage = el.querySelector('.gallery__stage');
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    dragX = e.clientX;
  };
  const onUp = (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    dragX = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };

  el.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('resize', onResize);

  active = {
    el,
    lastFocus: document.activeElement,
    teardown() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
    },
  };

  show(Math.min(Math.max(0, startIndex), photos.length - 1), 1);
  requestAnimationFrame(() => {
    el.classList.add('is-open');
    el.querySelector('.icon-btn[data-close]').focus({ preventScroll: true });
  });
}

export function closeGallery({ instant = false } = {}) {
  if (!active) return;
  const { el, lastFocus, teardown } = active;
  active = null;
  teardown();
  document.documentElement.classList.remove('is-locked');

  const remove = () => el.remove();
  if (instant || prefersReducedMotion()) {
    remove();
  } else {
    el.classList.remove('is-open');
    el.classList.add('is-closing');
    setTimeout(remove, 340);
  }
  if (!instant && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
}
