export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Parses YYYY-MM-DD as a local date (avoids UTC off-by-one). */
function parseDate(iso) {
  const [y, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ageFrom(birthDate, now = new Date()) {
  const b = parseDate(birthDate);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatAge(birthDate, { short = false } = {}) {
  const { years, months } = ageFrom(birthDate);
  if (years === 0) return short ? `${months} mo` : plural(months, 'month');
  if (short) return years === 1 ? '1 yr' : `${years} yrs`;
  return months ? `${plural(years, 'year')}, ${months} mo` : plural(years, 'year');
}

/** A dog's age: exact from `birthDate`, or `~13–14 years` when only `ageApprox` is known. */
export function dogAge(dog, { short = false } = {}) {
  if (dog.ageApprox) return `~${dog.ageApprox} ${short ? 'yrs' : 'years'}`;
  return formatAge(dog.birthDate, { short });
}

export function formatDate(iso) {
  return parseDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** FNV-1a string hash → 32-bit unsigned int. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG so generated art is stable between renders. */
export function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs a DOM update inside a View Transition when supported. */
export function withViewTransition(update) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return Promise.resolve();
  }
  const transition = document.startViewTransition(update);
  return transition.finished.catch(() => {});
}

/** Adds `.is-visible` to `.reveal` elements as they scroll into view. */
export function observeReveals(root = document) {
  const items = $$('.reveal:not(.is-visible)', root);
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    items.forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
