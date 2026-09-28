import { dogs, getDog, traitLabels } from '../data/dogs.js';
import { openGallery } from '../components/gallery.js';
import { genderIcon, coatSwatch, eyeSwatch, statusClass } from '../components/dogCard.js';
import { dogPhoto, dogPhotos, focusStyle } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { $, dogAge, escapeHtml, formatDate } from '../lib/utils.js';
import { renderNotFound } from './notFound.js';

const e = escapeHtml;

function neighbours(dog) {
  const i = dogs.indexOf(dog);
  return { prev: dogs[(i - 1 + dogs.length) % dogs.length], next: dogs[(i + 1) % dogs.length] };
}

function specRow(label, value, iconName) {
  return `<div class="spec"><dt>${icon(iconName)}<span>${label}</span></dt><dd>${value}</dd></div>`;
}

function hero(dog, photos) {
  const cover = photos[0];
  return `
  <section class="profile-hero">
    <button type="button" class="profile-hero__portrait glass" data-open-gallery="0" aria-label="Open ${e(dog.name)}’s gallery">
      <img src="${cover.src}" alt="${e(dog.name)}, portrait" style="view-transition-name: dog-hero; ${focusStyle(cover)}" />
      <span class="profile-hero__zoom">${icon('images')}<span>${photos.length} photos</span></span>
    </button>

    <div class="profile-hero__info">
      <span class="status ${statusClass(dog.status)} reveal">${e(dog.status)}</span>
      <h1 class="profile-hero__name reveal">${e(dog.name)} ${genderIcon(dog.gender)}</h1>
      <p class="profile-hero__aka reveal">a.k.a. ${dog.nicknames.map((n) => `<em>${e(n)}</em>`).join('<span aria-hidden="true"> · </span>')}</p>
      <p class="profile-hero__lore reveal">${e(dog.lore)}</p>

      <ul class="quick-facts">
        ${[
          ['cake', 'Age', dogAge(dog)],
          [dog.gender, 'Gender', dog.gender === 'male' ? 'Boy' : 'Girl'],
          dog.weight && ['weight', 'Weight', `${dog.weight} kg`],
          dog.height && ['ruler', 'Height', `${dog.height} cm`],
        ]
          .filter(Boolean)
          .map(
            ([ic, label, value], i) =>
              `<li class="glass reveal" style="--i:${i + 4}"><span class="quick-facts__icon">${icon(ic)}</span><div><small>${label}</small><strong>${value}</strong></div></li>`,
          )
          .join('')}
      </ul>

      <div class="tag-row reveal" style="--i:8">${dog.tags.map((t) => `<span class="chip chip--soft">${icon('tag')}${e(t)}</span>`).join('')}</div>

      <div class="profile-hero__actions reveal" style="--i:9">
        <button type="button" class="btn btn--primary" data-open-gallery="0">${icon('images')}<span>Open gallery</span></button>
        <a class="btn btn--ghost" href="#/dog/${dog.id}" data-scroll="story">${icon('book')}<span>Read the story</span></a>
        <a class="btn btn--ghost" href="#/dog/${dog.id}" data-scroll="viewer">${icon('cube')}<span>See in 3D</span></a>
      </div>
    </div>
  </section>`;
}

function viewerPanel(dog) {
  return `
  <section class="viewer glass reveal" id="viewer" aria-label="${e(dog.name)} in 3D">
    <div class="panel-head">
      <div>
        <p class="eyebrow">${icon('cube')} Interactive 3D</p>
        <h2 class="panel-title">${e(dog.name)} in 3D</h2>
      </div>
      <span class="badge" data-viewer-badge>${dog.model ? 'Loading model…' : 'Placeholder model'}</span>
    </div>
    <div class="viewer__canvas" data-viewer>
      <div class="viewer__loading" data-viewer-loading><span class="spinner"></span><span>Warming up the 3D scene…</span></div>
      <p class="viewer__hint" data-viewer-hint>${icon('rotate')} Drag to rotate · double-click to reset</p>
    </div>
    <div class="viewer__toolbar" role="toolbar" aria-label="3D controls">
      <button type="button" class="tool-btn" data-3d="rotate" aria-pressed="true">${icon('rotate')}<span>Auto-rotate</span></button>
      <button type="button" class="tool-btn" data-3d="wag">${icon('sparkles')}<span>Wag</span></button>
      <button type="button" class="tool-btn" data-3d="howl">${icon('music')}<span>Howl</span></button>
      <span class="viewer__spacer"></span>
      <button type="button" class="tool-btn tool-btn--icon" data-3d="zoom-out" aria-label="Zoom out">${icon('minus')}</button>
      <button type="button" class="tool-btn tool-btn--icon" data-3d="zoom-in" aria-label="Zoom in">${icon('plus')}</button>
      <button type="button" class="tool-btn tool-btn--icon" data-3d="reset" aria-label="Reset view">${icon('reset')}</button>
    </div>
    <p class="viewer__note">${icon('info')}<span>${
      dog.model
        ? `Showing ${e(dog.name)}’s own 3D model.`
        : `A stylised stand-in built from ${e(dog.name)}’s real coat and eye colors. The real 3D model will appear here once it’s added.`
    }</span></p>
  </section>`;
}

function specsPanel(dog) {
  const eyes = eyeSwatch(dog);
  return `
  <aside class="specs glass reveal" aria-labelledby="specs-title">
    <div class="panel-head">
      <div>
        <p class="eyebrow">${icon('paw')} Profile</p>
        <h2 class="panel-title" id="specs-title">Specs &amp; looks</h2>
      </div>
    </div>
    <dl class="spec-list">
      ${[
        ['Breed', e(dog.breed), 'star'],
        ['Birthday', dog.birthApprox ? e(dog.birthApprox) : formatDate(dog.birthDate), 'cake'],
        ['Age', dogAge(dog), 'clock'],
        ['Gender', dog.gender === 'male' ? 'Male' : 'Female', dog.gender],
        dog.joined && ['Joined HuskyHub', formatDate(dog.joined), 'home'],
        ['Coat color', `${coatSwatch(dog)}${e(dog.coat.color)}`, 'palette'],
        dog.coat.pattern && ['Coat pattern', e(dog.coat.pattern), 'palette'],
        ['Fur length', e(dog.coat.length), 'wind'],
        ['Eye color', `${eyes}${e(dog.eyes.label)}`, 'eye'],
        dog.height && ['Height', `${dog.height} cm at the shoulder`, 'ruler'],
        dog.weight && ['Weight', `${dog.weight} kg`, 'weight'],
        dog.tail && ['Tail', e(dog.tail), 'sparkles'],
        dog.ears && ['Ears', e(dog.ears), 'sparkles'],
        ['Temper', e(dog.temper), 'heart'],
      ]
        .filter(Boolean)
        .map(([label, value, ic]) => specRow(label, value, ic))
        .join('')}
    </dl>
  </aside>`;
}

function storySection(dog) {
  return `
  <section class="story-grid" id="story">
    <article class="story glass reveal">
      <p class="eyebrow">${icon('book')} Lore</p>
      <h2 class="panel-title">The story of ${e(dog.name)}</h2>
      <div class="story__body">${dog.story.map((p) => `<p>${e(p)}</p>`).join('')}</div>
    </article>
    <aside class="timeline glass reveal" aria-labelledby="timeline-title">
      <p class="eyebrow">${icon('clock')} Timeline</p>
      <h2 class="panel-title" id="timeline-title">Milestones</h2>
      <ol class="timeline__list">
        ${dog.timeline
          .map(
            (item) => `
          <li class="timeline__item">
            <span class="timeline__when">${e(item.when)}</span>
            <strong>${e(item.title)}</strong>
            <p>${e(item.text)}</p>
          </li>`,
          )
          .join('')}
      </ol>
    </aside>
  </section>`;
}

function temperamentSection(dog) {
  const goodWith = [
    ['kids', 'Kids'],
    ['dogs', 'Other dogs'],
    ['cats', 'Cats'],
  ];
  return `
  <section class="two-col">
    <div class="temperament glass reveal">
      <p class="eyebrow">${icon('zap')} Temperament</p>
      <h2 class="panel-title">${e(dog.temper)}</h2>
      <div class="traits">
        ${Object.entries(traitLabels)
          .filter(([key]) => dog.traits[key] != null)
          .map(([key, label]) => {
            const v = dog.traits[key];
            return `
          <div class="trait">
            <div class="trait__top"><span>${label}</span><span class="trait__value">${v}/10</span></div>
            <div class="trait__bar" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}">
              <span style="--v:${v / 10}"></span>
            </div>
          </div>`;
          })
          .join('')}
      </div>
      ${
        dog.goodWith
          ? `<div class="good-with">
        <span class="good-with__label">Good with</span>
        ${goodWith
          .map(
            ([key, label]) =>
              `<span class="good-with__item ${dog.goodWith[key] ? 'is-yes' : 'is-no'}">${icon(dog.goodWith[key] ? 'check' : 'x')}${label}</span>`,
          )
          .join('')}
      </div>`
          : ''
      }
    </div>

    <div class="habits glass reveal">
      <p class="eyebrow">${icon('paw')} Habits &amp; quirks</p>
      <h2 class="panel-title">A day with ${e(dog.name)}</h2>
      <ul class="habit-list">
        ${dog.habits.map((h, i) => `<li style="--i:${i}"><span class="habit-list__icon">${icon('paw')}</span><span>${e(h)}</span></li>`).join('')}
      </ul>
    </div>
  </section>`;
}

function favoritesSection(dog) {
  const favs = [
    ['food', 'Favourite food', 'utensils'],
    ['toy', 'Favourite toy', 'ball'],
    ['place', 'Favourite place', 'mapPin'],
    ['activity', 'Favourite activity', 'pulse'],
  ];
  return `
  <section class="favorites" aria-label="Favourites">
    ${favs
      .filter(([key]) => dog.favorites?.[key])
      .map(
        ([key, label, ic], i) => `
      <div class="fav glass reveal" style="--i:${i}">
        <span class="fav__icon">${icon(ic)}</span>
        <small>${label}</small>
        <strong>${e(dog.favorites[key])}</strong>
      </div>`,
      )
      .join('')}
  </section>`;
}

function detailsSection(dog) {
  const health = [
    ['vaccinated', 'Vaccinated'],
    ['neutered', dog.gender === 'male' ? 'Neutered' : 'Spayed'],
    ['microchipped', 'Microchipped'],
  ];
  const panels = [
    dog.skills?.length &&
      `<div class="glass panel reveal">
      <p class="eyebrow">${icon('star')} Skills</p>
      <h2 class="panel-title">Knows how to</h2>
      <div class="tag-row">${dog.skills.map((s) => `<span class="chip">${e(s)}</span>`).join('')}</div>
    </div>`,
    dog.health &&
      `<div class="glass panel reveal">
      <p class="eyebrow">${icon('shield')} Health</p>
      <h2 class="panel-title">Health card</h2>
      <ul class="health-list">
        ${health
          .map(
            ([k, label]) =>
              `<li class="${dog.health[k] ? 'is-yes' : 'is-no'}">${icon(dog.health[k] ? 'check' : 'x')}${label}</li>`,
          )
          .join('')}
      </ul>
      ${dog.health.notes ? `<p class="panel-note">${e(dog.health.notes)}</p>` : ''}
    </div>`,
    dog.facts?.length &&
      `<div class="glass panel reveal">
      <p class="eyebrow">${icon('sparkles')} Fun facts</p>
      <h2 class="panel-title">Did you know?</h2>
      <ul class="fact-list">${dog.facts.map((f) => `<li>${e(f)}</li>`).join('')}</ul>
    </div>`,
  ].filter(Boolean);
  return panels.length ? `<section class="three-col">${panels.join('')}</section>` : '';
}

function gallerySection(dog, photos) {
  return `
  <section class="profile-gallery glass reveal" aria-labelledby="gallery-heading">
    <div class="panel-head">
      <div>
        <p class="eyebrow">${icon('images')} Gallery</p>
        <h2 class="panel-title" id="gallery-heading">Moments with ${e(dog.name)}</h2>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" data-open-gallery="0">${icon('maximize')}<span>Full screen</span></button>
    </div>
    <div class="photo-grid">
      ${photos
        .map(
          (p, i) => `
        <button type="button" class="photo-grid__item" data-open-gallery="${i}" style="--i:${i}" aria-label="Open photo: ${e(p.caption)}">
          <img src="${p.src}" style="${focusStyle(p)}" alt="" loading="lazy" decoding="async" />
          <span class="photo-grid__caption">${e(p.caption)}</span>
        </button>`,
        )
        .join('')}
    </div>
  </section>`;
}

function friendsSection(dog) {
  const friends = dog.friends.map(getDog).filter(Boolean);
  if (!friends.length) return '';
  return `
  <section class="friends" aria-labelledby="friends-title">
    <div class="reveal">
      <p class="eyebrow">${icon('users')} Best friends</p>
      <h2 class="section-title section-title--sm" id="friends-title">${e(dog.name)}’s pack mates</h2>
    </div>
    <div class="friend-row">
      ${friends
        .map(
          (f, i) => `
        <a class="friend glass reveal" href="#/dog/${f.id}" style="--i:${i + 1};--accent-1:${f.accent[0]};--accent-2:${f.accent[1]}">
          <img src="${dogPhoto(f, 0).src}" style="${focusStyle(dogPhoto(f, 0))}" alt="" loading="lazy" />
          <span><strong>${e(f.name)}</strong><small>${e(f.tagline)}</small></span>
          ${icon('arrowRight')}
        </a>`,
        )
        .join('')}
    </div>
  </section>`;
}

function pager(dog) {
  const { prev, next } = neighbours(dog);
  const link = (d, dir) => `
    <a class="pager__link pager__link--${dir} glass" href="#/dog/${d.id}">
      ${dir === 'prev' ? icon('arrowLeft') : ''}
      <img src="${dogPhoto(d, 0).src}" style="${focusStyle(dogPhoto(d, 0))}" alt="" />
      <span><small>${dir === 'prev' ? 'Previous' : 'Next'} husky</small><strong>${e(d.name)}</strong></span>
      ${dir === 'next' ? icon('arrowRight') : ''}
    </a>`;
  return `<nav class="pager" aria-label="More huskies">${link(prev, 'prev')}${link(next, 'next')}</nav>`;
}

export function renderDog(app, { id }) {
  const dog = getDog(id);
  if (!dog) return renderNotFound(app);
  const photos = dogPhotos(dog);

  document.title = `${dog.name} · HuskyHub`;
  app.innerHTML = `
  <div class="profile" style="--accent-1:${dog.accent[0]};--accent-2:${dog.accent[1]}">
    <div class="profile__glow" aria-hidden="true"></div>
    <nav class="crumbs">
      <a class="btn btn--ghost btn--sm" href="#/">${icon('arrowLeft')}<span>All huskies</span></a>
      <span class="crumbs__trail">The pack <span aria-hidden="true">/</span> <strong>${e(dog.name)}</strong></span>
    </nav>
    ${hero(dog, photos)}
    <section class="profile-grid">
      ${viewerPanel(dog)}
      ${specsPanel(dog)}
    </section>
    ${storySection(dog)}
    ${temperamentSection(dog)}
    ${favoritesSection(dog)}
    ${detailsSection(dog)}
    ${gallerySection(dog, photos)}
    ${friendsSection(dog)}
    ${pager(dog)}
  </div>`;

  const root = $('.profile', app);

  const onClick = (ev) => {
    const g = ev.target.closest('[data-open-gallery]');
    if (g) {
      openGallery(dog, Number(g.dataset.openGallery), { showProfileLink: false });
      return;
    }
    const s = ev.target.closest('[data-scroll]');
    if (s) {
      ev.preventDefault();
      document.getElementById(s.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  root.addEventListener('click', onClick);

  // 3D viewer — three.js is loaded lazily so the home page stays light
  let viewer = null;
  let disposed = false;
  const viewerEl = $('[data-viewer]', root);
  const loadingEl = $('[data-viewer-loading]', root);
  const badge = $('[data-viewer-badge]', root);
  const hint = $('[data-viewer-hint]', root);

  import('../three/huskyViewer.js')
    .then(({ createHuskyViewer }) => {
      if (disposed) return;
      viewer = createHuskyViewer(viewerEl, dog, {
        onStatus: ({ state, custom, message }) => {
          if (state === 'ready') {
            loadingEl.classList.add('is-hidden');
            badge.textContent = custom ? 'Real model' : 'Placeholder model';
            badge.classList.toggle('badge--live', Boolean(custom));
            if (message) hint.textContent = message;
          }
        },
      });
      viewerEl.addEventListener('pointerdown', () => hint.classList.add('is-hidden'), { once: true });
    })
    .catch((err) => {
      console.error(err);
      loadingEl.innerHTML = `${icon('cube')}<span>3D preview isn’t available in this browser (WebGL is required).</span>`;
      $('.viewer__toolbar', root).hidden = true;
    });

  $('.viewer__toolbar', root).addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-3d]');
    if (!btn || !viewer) return;
    const action = btn.dataset['3d'];
    if (action === 'rotate') {
      viewer.setAutoRotate(!viewer.autoRotate);
      btn.setAttribute('aria-pressed', String(viewer.autoRotate));
    } else if (action === 'zoom-in') viewer.zoom(1);
    else if (action === 'zoom-out') viewer.zoom(-1);
    else if (action === 'reset') viewer.reset();
    else viewer.play(action);
    if (action === 'wag' || action === 'howl') {
      btn.classList.remove('is-pulsing');
      void btn.offsetWidth;
      btn.classList.add('is-pulsing');
    }
  });
  const rotateBtn = $('[data-3d="rotate"]', root);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) rotateBtn.setAttribute('aria-pressed', 'false');

  return () => {
    disposed = true;
    viewer?.dispose();
    document.title = 'HuskyHub';
  };
}
