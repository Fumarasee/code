/**
 * Gallery sheet. Opens over the current page for any dog:
 *   openGallery(dog, startIndex, { showProfileLink, origin })
 *
 * Fluid-interface behaviour (see the apple-design skill):
 * - grows out of the element that opened it (`origin`) and returns into it
 * - photos sit on a track that follows the pointer 1:1 after a 10 px
 *   threshold, with rubber-banding past the first/last photo
 * - release hands the pointer velocity to a spring and projects momentum to
 *   pick the photo; grabbing mid-flight continues from the on-screen position
 * - drag down to dismiss (velocity decides), background pushed back while open
 * - input is never locked out: closing stops intercepting pointers at once
 * Keyboard: ← → Home End to browse, Esc to close.
 */
import { dogPhotos, focusStyle } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { escapeHtml, prefersReducedMotion } from '../lib/utils.js';
import { Spring, VelocityTracker, haptic, project, rubberband } from '../lib/spring.js';

let active = null;

export const isGalleryOpen = () => Boolean(active && !active.closing);

export function closeGallery(opts) {
  active?.close(opts);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function openGallery(dog, startIndex = 0, { showProfileLink = true, origin = null } = {}) {
  if (active) active.close({ instant: true });

  const photos = dogPhotos(dog);
  const reduced = prefersReducedMotion();
  const app = document.getElementById('app');
  const root = document.getElementById('gallery-root');
  const last = photos.length - 1;
  let index = Math.min(Math.max(0, startIndex), last);

  const el = document.createElement('div');
  el.className = 'gallery';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'gallery-title');
  el.style.setProperty('--accent-1', dog.accent[0]);
  el.style.setProperty('--accent-2', dog.accent[1]);

  el.innerHTML = `
    <div class="gallery__backdrop" data-close></div>
    <div class="gallery__panel glass glass--thick">
      <header class="gallery__head">
        <div class="gallery__title">
          <img class="gallery__avatar" src="${photos[0].src}" style="${focusStyle(photos[0])}" alt="" />
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
        <div class="gallery__viewport" aria-roledescription="carousel">
          <div class="gallery__track">
            ${photos
              .map(
                (p, i) => `
              <figure class="gallery__slide" aria-roledescription="slide" aria-label="${i + 1} of ${photos.length}">
                <img src="${p.src}" alt="${escapeHtml(`${dog.name}: ${p.caption}`)}" draggable="false" decoding="async" />
              </figure>`,
              )
              .join('')}
          </div>
        </div>
        <button type="button" class="gallery__nav gallery__nav--next" data-step="1" aria-label="Next photo">${icon('chevronRight')}</button>
      </div>
      <p class="gallery__caption"></p>
      <div class="gallery__thumbs" role="tablist" aria-label="Photos">
        ${photos
          .map(
            (p, i) => `
          <button type="button" class="gallery__thumb" role="tab" data-index="${i}" aria-label="Photo ${i + 1}: ${escapeHtml(p.caption)}">
            <img src="${p.src}" style="${focusStyle(p)}" alt="" loading="lazy" decoding="async" draggable="false" />
          </button>`,
          )
          .join('')}
      </div>
    </div>`;

  root.appendChild(el);
  document.documentElement.classList.add('is-locked');

  const backdrop = el.querySelector('.gallery__backdrop');
  const panel = el.querySelector('.gallery__panel');
  const viewport = el.querySelector('.gallery__viewport');
  const track = el.querySelector('.gallery__track');
  const slides = [...el.querySelectorAll('.gallery__slide')];
  const images = slides.map((s) => s.querySelector('img'));
  const caption = el.querySelector('.gallery__caption');
  const counter = el.querySelector('.gallery__counter');
  const ambient = el.querySelector('.gallery__ambient');
  const thumbs = [...el.querySelectorAll('.gallery__thumb')];
  const prevBtn = el.querySelector('[data-step="-1"]');
  const nextBtn = el.querySelector('[data-step="1"]');

  let width = viewport.clientWidth;
  let closing = false;
  let exitDown = false;
  const originVec = { x: 0, y: 0 };

  /** Offset from the panel's centre to the element that opened (or will receive) it. */
  function measureOrigin() {
    const pr = panel.getBoundingClientRect();
    if (origin?.isConnected) {
      const r = origin.getBoundingClientRect();
      originVec.x = r.left + r.width / 2 - (pr.left + pr.width / 2);
      originVec.y = r.top + r.height / 2 - (pr.top + pr.height / 2);
    } else {
      originVec.x = 0;
      originVec.y = 40;
    }
  }

  /* --- rendering: everything is a function of three springs ------------- */

  function render() {
    const p = clamp01(presence.value);
    const y = dismissY.value;
    const pull = clamp01(Math.max(0, y) / (window.innerHeight * 0.6)); // dismiss progress
    backdrop.style.opacity = String(p * (1 - pull));
    if (reduced) {
      panel.style.opacity = String(p);
      return;
    }
    const fromOrigin = exitDown ? 0 : 1 - p;
    const scale = (0.6 + 0.4 * p) * (1 - pull * 0.15);
    panel.style.transform = `translate3d(${originVec.x * fromOrigin}px, ${originVec.y * fromOrigin + y}px, 0) scale(${scale})`;
    panel.style.opacity = String(clamp01(p * 1.5) * (1 - pull * 0.5));
    // Materialize: the glass sharpens as it arrives instead of just fading in
    const blur = (1 - p) * 8;
    panel.style.filter = blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : '';
    // Dim to focus: push the page back while the sheet is up
    app.style.transform = `scale(${1 - 0.025 * p * (1 - pull)})`;
  }

  const presence = new Spring(0, {
    damping: 1,
    response: reduced ? 0.2 : 0.4,
    precision: 0.001,
    onUpdate: render,
    onRest: () => closing && finish(),
  });
  const dismissY = new Spring(0, { damping: 1, response: 0.3, precision: 0.5, onUpdate: render });
  const trackX = new Spring(-index * width, {
    damping: 1,
    response: 0.38,
    precision: 0.5,
    onUpdate: (x) => {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    },
  });

  /* --- layout ------------------------------------------------------------ */

  function fit(img) {
    if (!img.naturalWidth) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    const w = Math.min(viewport.clientWidth, viewport.clientHeight * ratio);
    img.style.width = `${Math.round(w)}px`;
    img.style.height = `${Math.round(w / ratio)}px`;
  }
  images.forEach((img) => {
    if (img.complete) fit(img);
    else img.addEventListener('load', () => fit(img), { once: true });
  });

  const onResize = () => {
    width = viewport.clientWidth;
    trackX.set(-index * width);
    images.forEach(fit);
  };

  /* --- navigation -------------------------------------------------------- */

  function updateUI() {
    const photo = photos[index];
    caption.textContent = photo.caption;
    counter.textContent = `Photo ${index + 1} of ${photos.length}`;
    ambient.style.backgroundImage = `url("${photo.src}")`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === last;
    slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i !== index)));
    thumbs.forEach((t, i) => {
      const on = i === index;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }

  /** Go to a photo. `flick` adds a little bounce — only when the gesture had momentum. */
  function go(i, { velocity, flick = false } = {}) {
    const next = Math.min(Math.max(0, i), last);
    const changed = next !== index;
    index = next;
    if (reduced) {
      trackX.set(-index * width);
      if (changed) images[index].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    } else {
      trackX.to(-index * width, { damping: flick ? 0.85 : 1, response: flick ? 0.34 : 0.38, velocity });
    }
    updateUI();
    return changed;
  }

  /* --- gestures: detect both axes in parallel, commit after 10 px --------- */

  const tracker = new VelocityTracker();
  let gesture = null;

  const onPointerDown = (e) => {
    if (closing || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try {
      viewport.setPointerCapture(e.pointerId); // keep tracking outside the viewport
    } catch {
      /* pointer already gone */
    }
    // Grab whatever is on screen right now — never the target value
    trackX.stop();
    dismissY.stop();
    gesture = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      baseX: trackX.value,
      baseY: dismissY.value,
      axis: null,
      dx: 0,
    };
    tracker.reset();
    tracker.addEvent(e);
  };

  const onPointerMove = (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    tracker.addEvent(e);
    let dx = e.clientX - gesture.x0;
    let dy = e.clientY - gesture.y0;
    if (!gesture.axis) {
      if (Math.hypot(dx, dy) < 10) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      // Start tracking from here so nothing jumps by the threshold
      gesture.x0 = e.clientX;
      gesture.y0 = e.clientY;
      dx = 0;
      dy = 0;
      viewport.classList.add('is-dragging');
    }
    if (gesture.axis === 'x') {
      gesture.dx = dx;
      if (reduced) return;
      const min = -last * width;
      let x = gesture.baseX + dx;
      if (x > 0) x = rubberband(x, width);
      else if (x < min) x = min - rubberband(min - x, width);
      trackX.set(x);
    } else {
      let y = gesture.baseY + dy;
      if (y < 0) y = -rubberband(-y, window.innerHeight);
      dismissY.set(y);
    }
  };

  const onPointerEnd = (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const { axis, dx } = gesture;
    gesture = null;
    viewport.classList.remove('is-dragging');
    tracker.add(e.clientX, e.clientY, e.timeStamp); // the release itself: a pause reads as ~0 velocity
    const v = tracker.velocity();
    if (axis === 'x') {
      let target;
      if (reduced) target = index + (dx < -50 ? 1 : dx > 50 ? -1 : 0);
      else target = Math.round(-(trackX.value + project(v.x)) / width); // where the flick is going
      if (go(target, { velocity: v.x, flick: Math.abs(v.x) > 300 })) haptic();
    } else if (axis === 'y') {
      const landing = dismissY.value + project(v.y);
      if (v.y >= 0 && landing > window.innerHeight * 0.22) {
        haptic();
        close({ velocity: v.y });
      } else {
        dismissY.to(0, { velocity: v.y, damping: Math.abs(v.y) > 300 ? 0.8 : 1, response: 0.3 });
      }
    } else {
      // Grabbed mid-flight and let go without dragging: settle from here
      if (trackX.value !== -index * width) go(index);
      if (dismissY.value !== 0) dismissY.to(0);
    }
  };

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerEnd);
  viewport.addEventListener('pointercancel', onPointerEnd);

  /* --- clicks & keys ----------------------------------------------------- */

  const onClick = (e) => {
    if (e.target.closest('[data-close]')) return close();
    const step = e.target.closest('[data-step]');
    if (step) return go(index + Number(step.dataset.step));
    const thumb = e.target.closest('[data-index]');
    if (thumb) return go(Number(thumb.dataset.index));
    if (e.target.closest('a[href]')) close({ instant: true });
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight') {
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      go(index - 1);
    } else if (e.key === 'Home') {
      go(0);
    } else if (e.key === 'End') {
      go(last);
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog
      const focusables = [...el.querySelectorAll('button:not(:disabled), a[href]')].filter(
        (n) => n.offsetParent !== null,
      );
      const first = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  el.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  /* --- open / close ------------------------------------------------------ */

  const lastFocus = document.activeElement;

  function close({ instant = false, velocity } = {}) {
    if (closing) return;
    closing = true;
    active.closing = true;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove('is-locked');
    el.style.pointerEvents = 'none'; // the page is usable again immediately
    if (!instant && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    if (instant) {
      finish();
      return;
    }
    if (velocity !== undefined && !reduced) {
      // Swiped away: keep travelling in the direction of the throw
      exitDown = true;
      dismissY.to(window.innerHeight * 0.6, { velocity, response: 0.35 });
    } else {
      // Return along the same path it arrived on
      measureOrigin();
    }
    presence.to(0, { response: reduced ? 0.2 : 0.34 });
  }

  function finish() {
    presence.stop();
    dismissY.stop();
    trackX.stop();
    el.remove();
    app.style.transform = '';
    app.style.transformOrigin = '';
    app.style.willChange = '';
    if (active?.el === el) active = null;
  }

  active = { el, close, closing: false };

  trackX.set(-index * width);
  updateUI();
  measureOrigin();
  if (!reduced) {
    app.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2 - app.offsetTop}px`;
    app.style.willChange = 'transform';
  }
  render();
  presence.to(1);
  el.querySelector('.icon-btn[data-close]').focus({ preventScroll: true });
}
