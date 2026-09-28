import { icon } from '../lib/icons.js';
import { dogs } from '../data/dogs.js';
import { uiState } from '../lib/state.js';

const logo = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3cf2a4"/><stop offset=".55" stop-color="#34c6f4"/><stop offset="1" stop-color="#a86bff"/>
    </linearGradient>
  </defs>
  <path d="M14 30 L19 10 L28 22 L36 22 L45 10 L50 30 C50 44 42 54 32 54 C22 54 14 44 14 30 Z" fill="url(#brandGrad)"/>
  <path d="M32 30 C27 30 23 26 18 28 C18 40 24 48 32 50 C40 48 46 40 46 28 C41 26 37 30 32 30 Z" fill="#eaf6ff"/>
  <circle cx="25" cy="33" r="2.6" fill="#0a1024"/><circle cx="39" cy="33" r="2.6" fill="#0a1024"/>
  <path d="M29 40 Q32 38 35 40 Q34 43 32 43.5 Q30 43 29 40 Z" fill="#0a1024"/>
</svg>`;

export function renderHeader(el) {
  el.innerHTML = `
    <div class="site-header__inner">
      <a href="#/" class="brand" aria-label="HuskyHub — home">
        <span class="brand__mark">${logo}</span>
        <span class="brand__name">Husky<span>Hub</span></span>
      </a>
      <nav class="site-nav" aria-label="Main">
        <a href="#/" data-nav="home">${icon('paw')}<span>The pack</span></a>
        <button type="button" class="site-nav__search" data-action="search">
          ${icon('search')}<span>Find a husky</span><kbd>/</kbd>
        </button>
      </nav>
      <button type="button" class="btn btn--ghost btn--sm" data-action="random" title="Open a random husky">
        ${icon('shuffle')}<span>Surprise me</span>
      </button>
    </div>`;

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'random') {
      const currentId = location.hash.match(/#\/dog\/([\w-]+)/)?.[1];
      const pool = dogs.filter((d) => d.id !== currentId);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      location.hash = `#/dog/${pick.id}`;
    }
    if (btn.dataset.action === 'search') focusSearch();
  });

  const onScroll = () => el.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/** Focuses the home search bar, navigating home first if needed. */
export function focusSearch() {
  const input = document.getElementById('dog-search');
  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
    return;
  }
  uiState.focusSearchOnHome = true;
  location.hash = '#/';
}

export function updateNav(routeName) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === routeName);
    if (a.dataset.nav === routeName) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function renderFooter(el) {
  el.innerHTML = `
    <div class="site-footer__inner">
      <span class="brand__name brand__name--sm">Husky<span>Hub</span></span>
      <span>${dogs.length} huskies · one very loud choir · endless snow</span>
      <span class="site-footer__muted">© ${new Date().getFullYear()} HuskyHub</span>
    </div>`;
}
