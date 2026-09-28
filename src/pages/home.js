import { dogs, getDog } from '../data/dogs.js';
import { dogCard, attachCardEffects } from '../components/dogCard.js';
import { openGallery } from '../components/gallery.js';
import { dogPhoto } from '../lib/placeholders.js';
import { icon } from '../lib/icons.js';
import { $, $$, ageFrom, escapeHtml, formatAge, prefersReducedMotion } from '../lib/utils.js';
import { uiState } from '../lib/state.js';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'male', label: 'Boys', test: (d) => d.gender === 'male' },
  { id: 'female', label: 'Girls', test: (d) => d.gender === 'female' },
  { id: 'home', label: 'Looking for a home', test: (d) => /home/i.test(d.status) },
  { id: 'puppy', label: 'Puppies', test: (d) => ageFrom(d.birthDate).years < 2 },
  { id: 'senior', label: 'Seniors', test: (d) => ageFrom(d.birthDate).years >= 7 },
];

const SORTS = {
  name: { label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
  youngest: { label: 'Youngest first', fn: (a, b) => b.birthDate.localeCompare(a.birthDate) },
  oldest: { label: 'Oldest first', fn: (a, b) => a.birthDate.localeCompare(b.birthDate) },
  newest: { label: 'Newest arrivals', fn: (a, b) => b.joined.localeCompare(a.joined) },
};

/* ---------------------------------------------------------------- search -- */

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const searchIndex = dogs.map((d) => ({
  dog: d,
  text: normalize(
    [
      d.name,
      ...d.nicknames,
      d.tagline,
      d.coat.color,
      d.coat.pattern,
      d.coat.length,
      d.eyes.label,
      d.temper,
      d.status,
      d.breed,
      ...d.tags,
      d.gender === 'male' ? 'boy male' : 'girl female',
    ].join(' '),
  ),
}));

function searchDogs(query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return dogs.slice();
  return searchIndex.filter(({ text }) => tokens.every((t) => text.includes(t))).map((e) => e.dog);
}

function rank(dog, query) {
  const q = normalize(query);
  const name = normalize(dog.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (dog.nicknames.some((n) => normalize(n).startsWith(q))) return 3;
  return 4;
}

/** Explains why a dog matched, for the suggestion subtitle. */
function matchReason(dog, query) {
  const q = normalize(query).split(/\s+/)[0] || '';
  const nick = dog.nicknames.find((n) => normalize(n).includes(q));
  if (nick && !normalize(dog.name).includes(q)) return `a.k.a. ${nick}`;
  const fields = [dog.coat.color, dog.eyes.label, dog.temper, dog.status, ...dog.tags, dog.coat.pattern];
  const hit = fields.find((f) => normalize(f).includes(q));
  if (hit && !normalize(dog.name).includes(q)) return hit;
  return `${formatAge(dog.birthDate, { short: true })} · ${dog.coat.color} · ${dog.temper}`;
}

function highlight(text, query) {
  const q = normalize(query).split(/\s+/)[0];
  const i = q ? normalize(text).indexOf(q) : -1;
  if (i < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, i))}<mark>${escapeHtml(text.slice(i, i + q.length))}</mark>${escapeHtml(text.slice(i + q.length))}`;
}

function currentList() {
  const filter = FILTERS.find((f) => f.id === uiState.filter) || FILTERS[0];
  return searchDogs(uiState.query).filter(filter.test).sort(SORTS[uiState.sort]?.fn || SORTS.name.fn);
}

/* ------------------------------------------------------------------ view -- */

function heroStack() {
  const featured = dogs.filter((d) => /home/i.test(d.status)).slice(0, 3);
  return featured
    .map(
      (d, i) => `
      <a class="hero-stack__card glass" href="#/dog/${d.id}" style="--i:${i};--accent-1:${d.accent[0]};--accent-2:${d.accent[1]}" data-hero-dog="${d.id}">
        <img src="${dogPhoto(d, 0).src}" alt="${escapeHtml(d.name)}" data-hero-img />
        <span class="hero-stack__label"><strong>${escapeHtml(d.name)}</strong><small>${formatAge(d.birthDate, { short: true })} · ${escapeHtml(d.temper)}</small></span>
      </a>`,
    )
    .join('');
}

function template() {
  const lookingForHome = dogs.filter((d) => /home/i.test(d.status)).length;
  const photos = dogs.reduce((n, d) => n + d.photos.length, 0);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, dogs.filter(f.test).length]));

  return `
  <section class="hero">
    <div class="hero__content">
      <p class="eyebrow reveal">${icon('snowflake')} Welcome to HuskyHub</p>
      <h1 class="hero__title reveal">Meet the pack <span class="text-aurora">under the northern&nbsp;lights</span></h1>
      <p class="hero__lead reveal">Every husky here has a name, a story and a very strong opinion about snow.
        Find a friend, read their lore and flip through their photos.</p>

      <div class="search" role="search">
        <div class="search__field glass reveal" style="--i:3">
          ${icon('search')}
          <input id="dog-search" type="text" inputmode="search" autocomplete="off" spellcheck="false"
            placeholder="Search by name, nickname, coat, eyes, temper…"
            role="combobox" aria-label="Search huskies" aria-expanded="false"
            aria-controls="search-suggestions" aria-autocomplete="list" />
          <button type="button" class="search__clear" aria-label="Clear search" hidden>${icon('x')}</button>
          <kbd class="search__kbd" aria-hidden="true">/</kbd>
        </div>
        <ul class="search__suggestions glass glass--strong" id="search-suggestions" role="listbox" aria-label="Matching huskies" hidden></ul>
      </div>

      <ul class="hero__stats">
        <li class="stat glass reveal" style="--i:4"><strong>${dogs.length}</strong><span>huskies in the pack</span></li>
        <li class="stat glass reveal" style="--i:5"><strong>${lookingForHome}</strong><span>looking for a home</span></li>
        <li class="stat glass reveal" style="--i:6"><strong>${photos}</strong><span>photos &amp; counting</span></li>
      </ul>
    </div>

    <div class="hero__visual">
      <div class="hero-stack">${heroStack()}</div>
      <p class="hero-stack__caption">${icon('heart')} Looking for a family</p>
    </div>
  </section>

  <section class="pack" id="pack" aria-labelledby="pack-title">
    <div class="pack__head">
      <div>
        <p class="eyebrow">${icon('paw')} The pack</p>
        <h2 id="pack-title" class="section-title">All our huskies</h2>
      </div>
      <div class="pack__tools">
        <span class="pack__count" aria-live="polite"></span>
        <label class="select glass">
          <span class="sr-only">Sort huskies</span>
          ${icon('clock')}
          <select id="dog-sort">
            ${Object.entries(SORTS)
              .map(([id, s]) => `<option value="${id}">${s.label}</option>`)
              .join('')}
          </select>
        </label>
      </div>
    </div>

    <div class="chips" role="group" aria-label="Filter huskies">
      ${FILTERS.map(
        (f) => `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="false">
            ${escapeHtml(f.label)}<span class="chip__count">${counts[f.id]}</span></button>`,
      ).join('')}
    </div>

    <div class="dog-grid" id="dog-grid"></div>

    <div class="empty glass" hidden>
      <div class="empty__icon">${icon('snowflake')}</div>
      <h3>No huskies found</h3>
      <p class="empty__text"></p>
      <button type="button" class="btn btn--primary" data-reset>${icon('reset')}<span>Show the whole pack</span></button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------ controller -- */

export function renderHome(app, { fromDogId = null } = {}) {
  app.innerHTML = template();
  const reduced = prefersReducedMotion();

  const grid = $('#dog-grid', app);
  const input = $('#dog-search', app);
  const clearBtn = $('.search__clear', app);
  const suggestionsEl = $('#search-suggestions', app);
  const sortSelect = $('#dog-sort', app);
  const countEl = $('.pack__count', app);
  const emptyEl = $('.empty', app);

  input.value = uiState.query;
  clearBtn.hidden = !uiState.query;
  sortSelect.value = uiState.sort;

  let renderedIds = '';

  /**
   * Re-renders the grid. Cards that stay visible glide to their new spot
   * (FLIP animation); newly shown cards fade in with a stagger.
   */
  function update() {
    const list = currentList();
    const ids = list.map((d) => d.id).join(',');
    countEl.textContent = `${list.length} of ${dogs.length} huskies`;
    $$('[data-filter]', app).forEach((chip) => {
      const on = chip.dataset.filter === uiState.filter;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    emptyEl.hidden = list.length > 0;
    if (!list.length) {
      const q = uiState.query.trim();
      $('.empty__text', emptyEl).textContent = q
        ? `Nobody matches “${q}” here. Try a name, a nickname like “Houdini”, or a coat color like “copper”.`
        : 'No huskies match this filter yet.';
    }
    if (ids === renderedIds) return;

    const before = new Map();
    if (renderedIds && !reduced) {
      $$('.dog-card', grid).forEach((c) => before.set(c.dataset.id, c.getBoundingClientRect()));
    }
    renderedIds = ids;
    grid.innerHTML = list.map((d, i) => dogCard(d, i)).join('');
    if (!before.size) return;

    let fresh = 0;
    $$('.dog-card', grid).forEach((card) => {
      const old = before.get(card.dataset.id);
      if (!old) {
        card.style.setProperty('--i', fresh++);
        return;
      }
      card.classList.add('dog-card--static');
      const now = card.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (dx || dy) {
        card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
          duration: 650,
          easing: 'cubic-bezier(.22,1,.36,1)',
        });
      }
    });
  }

  update();

  // Returning from a profile: morph the portrait back into its card
  if (fromDogId) {
    const card = $(`.dog-card[data-id="${fromDogId}"]`, grid);
    if (card) {
      card.classList.add('dog-card--static');
      const img = $('img', card);
      img.style.viewTransitionName = 'dog-hero';
      img.dataset.vtTemp = '';
    }
  }

  /* --- search + suggestions --- */
  let activeIndex = -1;
  let suggestions = [];

  function hideSuggestions() {
    suggestionsEl.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function renderSuggestions() {
    const q = input.value.trim();
    if (!q || document.activeElement !== input) return hideSuggestions();
    suggestions = searchDogs(q)
      .sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name))
      .slice(0, 6);
    activeIndex = Math.min(activeIndex, suggestions.length - 1);
    suggestionsEl.innerHTML = suggestions.length
      ? suggestions
          .map(
            (d, i) => `
          <li role="option" id="suggestion-${d.id}" class="search__option${i === activeIndex ? ' is-active' : ''}"
              data-id="${d.id}" aria-selected="${i === activeIndex}">
            <img src="${dogPhoto(d, 0).src}" alt="" />
            <span class="search__option-text">
              <strong>${highlight(d.name, q)}</strong>
              <small>${highlight(matchReason(d, q), q)}</small>
            </span>
            <span class="search__option-go">${icon('arrowRight')}</span>
          </li>`,
          )
          .join('')
      : `<li class="search__none">No husky answers to “${escapeHtml(q)}”… yet.</li>`;
    suggestionsEl.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `suggestion-${suggestions[activeIndex].id}`);
    else input.removeAttribute('aria-activedescendant');
  }

  const goTo = (id) => {
    hideSuggestions();
    location.hash = `#/dog/${id}`;
  };

  input.addEventListener('input', () => {
    uiState.query = input.value;
    clearBtn.hidden = !input.value;
    activeIndex = -1;
    update();
    renderSuggestions();
  });
  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('blur', () => setTimeout(hideSuggestions, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!suggestions.length || suggestionsEl.hidden) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + step + suggestions.length) % suggestions.length;
      renderSuggestions();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const results = currentList();
      if (activeIndex >= 0 && suggestions[activeIndex]) goTo(suggestions[activeIndex].id);
      else if (results.length === 1) goTo(results[0].id);
      else {
        hideSuggestions();
        $('#pack', app).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }
    } else if (e.key === 'Escape') {
      if (input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
      } else {
        input.blur();
      }
    }
  });
  suggestionsEl.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus in the input
  suggestionsEl.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-id]');
    if (opt) goTo(opt.dataset.id);
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  });

  /* --- filters + sort --- */
  $('.chips', app).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip || chip.dataset.filter === uiState.filter) return;
    uiState.filter = chip.dataset.filter;
    update();
  });
  sortSelect.addEventListener('change', () => {
    uiState.sort = sortSelect.value;
    update();
  });
  $('[data-reset]', app).addEventListener('click', () => {
    uiState.query = '';
    uiState.filter = 'all';
    input.value = '';
    clearBtn.hidden = true;
    update();
  });

  /* --- cards: gallery overlay + shared-element transition to the profile --- */
  const markHero = (img) => {
    $$('[data-vt-temp]').forEach((el) => {
      el.style.viewTransitionName = '';
      delete el.dataset.vtTemp;
    });
    if (!img) return;
    img.style.viewTransitionName = 'dog-hero';
    img.dataset.vtTemp = '';
  };

  const onGridClick = (e) => {
    const galleryBtn = e.target.closest('[data-gallery]');
    if (galleryBtn) {
      e.preventDefault();
      openGallery(getDog(galleryBtn.dataset.gallery), 0);
      return;
    }
    const card = e.target.closest('.dog-card');
    if (card) markHero($('img', card));
  };
  grid.addEventListener('click', onGridClick);

  $('.hero-stack', app).addEventListener('click', (e) => {
    const card = e.target.closest('[data-hero-dog]');
    if (card) markHero($('[data-hero-img]', card));
  });

  const detachEffects = attachCardEffects(grid);

  if (uiState.focusSearchOnHome) {
    uiState.focusSearchOnHome = false;
    requestAnimationFrame(() => {
      input.scrollIntoView({ block: 'center' });
      input.focus({ preventScroll: true });
    });
  }

  return () => {
    detachEffects();
  };
}
