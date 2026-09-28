import { icon } from '../lib/icons.js';

export function renderNotFound(app) {
  app.innerHTML = `
  <section class="not-found glass reveal">
    <div class="empty__icon">${icon('snowflake')}</div>
    <p class="eyebrow">404 · Lost in the snow</p>
    <h1 class="section-title">This trail leads nowhere</h1>
    <p>The husky you’re looking for might have escaped (we’re looking at you, Loki).</p>
    <a class="btn btn--primary" href="#/">${icon('paw')}<span>Back to the pack</span></a>
  </section>`;
  return () => {};
}
