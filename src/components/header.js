import { icon } from '../lib/icons.js';
import { dogs } from '../data/dogs.js';
import { uiState } from '../lib/state.js';

// Official HuskyHub logo, light-lettered version for the dark theme
// (original colours: public/brand/huskyhub-logo.webp)
const LOGO_SRC = `${import.meta.env.BASE_URL}brand/huskyhub-logo-dark.webp`;
const logo = (cls = '') =>
  `<img class="brand__logo ${cls}" src="${LOGO_SRC}" alt="HuskyHub" width="900" height="188" decoding="async" />`;

export function renderHeader(el) {
  el.innerHTML = `
    <div class="site-header__inner">
      <a href="#/" class="brand" aria-label="HuskyHub — home">${logo()}</a>
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
      ${logo('brand__logo--sm')}
      <span>${dogs.length} huskies · one very loud choir · endless snow</span>
      <span class="site-footer__muted">© ${new Date().getFullYear()} HuskyHub</span>
    </div>`;
}
