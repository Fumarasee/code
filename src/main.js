import './styles/tokens.css';
import './styles/base.css';
import './styles/aurora.css';
import './styles/components.css';
import './styles/home.css';
import './styles/profile.css';
import './styles/gallery.css';

import { initAurora } from './components/aurora.js';
import { renderHeader, renderFooter, updateNav, focusSearch } from './components/header.js';
import { closeGallery, isGalleryOpen } from './components/gallery.js';
import { renderHome } from './pages/home.js';
import { renderDog } from './pages/dog.js';
import { renderNotFound } from './pages/notFound.js';
import { $$, observeReveals, withViewTransition } from './lib/utils.js';
import { uiState } from './lib/state.js';
import { springEasing, supportsLinearEasing } from './lib/spring.js';

// One motion language: CSS state changes run on the exact spring the JS uses
// (critically damped, 0.35 s response), expressed as a CSS linear() curve.
if (supportsLinearEasing()) {
  const { easing, duration } = springEasing({ damping: 1, response: 0.35 });
  document.documentElement.style.setProperty('--spring', easing);
  document.documentElement.style.setProperty('--spring-duration', `${duration}s`);
}

// iOS Safari only shows :active (press feedback) once a touch listener exists
document.addEventListener('touchstart', () => {}, { passive: true });

const app = document.getElementById('app');

function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path] = raw.split('?');
  const dogMatch = path.match(/^\/dog\/([\w-]+)\/?$/);
  if (dogMatch) return { name: 'dog', id: decodeURIComponent(dogMatch[1]) };
  if (path === '/' || path === '') return { name: 'home' };
  return { name: 'notfound' };
}

let current = null;
let cleanup = null;
let stopReveals = () => {};

function render(route, previous) {
  cleanup?.();
  stopReveals();
  document.documentElement.dataset.route = route.name;

  if (route.name === 'home') {
    cleanup = renderHome(app, { fromDogId: previous?.name === 'dog' ? previous.id : null });
  } else if (route.name === 'dog') {
    cleanup = renderDog(app, route);
  } else {
    cleanup = renderNotFound(app);
  }

  updateNav(route.name);
  stopReveals = observeReveals(app);

  const y = route.name === 'home' && previous ? uiState.homeScroll : 0;
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
}

function navigate() {
  const next = parseRoute();
  const previous = current;
  if (previous?.name === 'home') uiState.homeScroll = window.scrollY;
  if (isGalleryOpen()) closeGallery({ instant: true });
  current = next;

  if (!previous) {
    render(next, null);
    return;
  }

  withViewTransition(() => render(next, previous)).then(() => {
    // Temporary shared-element names are only needed for the transition itself
    $$('[data-vt-temp]').forEach((el) => {
      el.style.viewTransitionName = '';
      delete el.dataset.vtTemp;
    });
  });
}

// Global "/" shortcut focuses the search bar
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isGalleryOpen()) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  e.preventDefault();
  focusSearch();
});

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

renderHeader(document.getElementById('site-header'));
renderFooter(document.getElementById('site-footer'));
initAurora();
window.addEventListener('hashchange', navigate);
navigate();
