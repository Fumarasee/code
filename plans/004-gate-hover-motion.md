# 004 — Gate hover motion to devices that really hover

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: LOW
- **Category**: Accessibility
- **Estimated scope**: 3 files (`src/styles/components.css`, `src/styles/home.css`, `src/styles/profile.css`); 13 rules wrapped in media queries

## Problem

Touch screens fire `:hover` on tap, and it stays stuck until the next tap somewhere else. Every hover rule
below moves or scales something, or shows the pointer spotlight, and none is restricted to real hover
devices. On a phone or tablet:

- after closing the gallery opened from a card, that card's photo stays zoomed to 1.05;
- the card's spotlight shows as a blob in the top-left corner, because the JS that moves it is disabled on
  touch;
- a tapped profile photo stays zoomed with its caption showing.

The JS tilt effect is already gated correctly. This plan brings the CSS in line:

```js
/* src/components/dogCard.js:66 — exemplar, already correct */
  if (prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
```

Current rules, verbatim:

```css
/* src/styles/components.css:593-595 */
.dog-card:hover .dog-card__glow {
  opacity: 1;
}

/* src/styles/components.css:615-617 */
.dog-card:hover .dog-card__media img {
  scale: 1.05;
}

/* src/styles/components.css:781-783 */
.dog-card:hover .dog-card__cta .icon {
  translate: 0.25rem 0;
}

/* src/styles/home.css:209-213 */
.search__option:hover .search__option-go,
.search__option.is-active .search__option-go {
  opacity: 1;
  translate: 0 0;
}

/* src/styles/home.css:311-322 */
.hero-stack:hover .hero-stack__card {
  transform: translateX(calc(var(--x) * 1.6)) rotate(calc(var(--r) * 1.5));
}

.hero-stack:hover .hero-stack__card:hover {
  z-index: 4;
  border-color: color-mix(in srgb, var(--accent-1) 60%, transparent);
  box-shadow:
    var(--glass-edge),
    0 1.875rem 4.375rem -1.5rem color-mix(in srgb, var(--accent-1) 70%, transparent);
  transform: translateX(calc(var(--x) * 1.6)) rotate(calc(var(--r) * 0.6)) translateY(-1.125rem);
}

/* src/styles/profile.css:74-76 */
.profile-hero__portrait:hover {
  translate: 0 -0.25rem;
}

/* src/styles/profile.css:146-150 */
.profile-hero__portrait:hover .profile-hero__zoom,
.profile-hero__portrait:focus-visible .profile-hero__zoom {
  opacity: 1;
  translate: -50% 0;
}

/* src/styles/profile.css:876-878 */
.photo-grid__item:hover img {
  scale: 1.05;
}

/* src/styles/profile.css:896-900 */
.photo-grid__item:hover .photo-grid__caption,
.photo-grid__item:focus-visible .photo-grid__caption {
  opacity: 1;
  translate: 0 0;
}

/* src/styles/profile.css:922-925 */
.friend:hover {
  translate: 0 -0.1875rem;
  border-color: color-mix(in srgb, var(--accent-1) 50%, transparent);
}

/* src/styles/profile.css:957-960 */
.friend:hover > .icon {
  color: var(--accent-1);
  translate: 0.25rem 0;
}

/* src/styles/profile.css:983-986 */
.pager__link:hover {
  translate: 0 -0.1875rem;
  border-color: var(--glass-border-hi);
}

/* src/styles/profile.css:1024-1030 */
.pager__link--prev:hover > .icon {
  translate: -0.25rem 0;
}

.pager__link--next:hover > .icon {
  translate: 0.25rem 0;
}
```

## Target

Each rule above is wrapped in place, keeping its position in the file so the cascade order doesn't change,
in exactly this media query (the same one as the JS):

```css
@media (hover: hover) and (pointer: fine) {
  /* …the unchanged rule… */
}
```

Three rules share a selector list with a non-hover state (`.is-active` for keyboard navigation and
`:focus-visible` for keyboard focus). Those must keep working on every device, so **split** them. The
non-hover part stays ungated and the `:hover` part gets wrapped:

```css
/* target — src/styles/home.css (replaces 209-213) */
.search__option.is-active .search__option-go {
  opacity: 1;
  translate: 0 0;
}

@media (hover: hover) and (pointer: fine) {
  .search__option:hover .search__option-go {
    opacity: 1;
    translate: 0 0;
  }
}
```

```css
/* target — src/styles/profile.css (replaces 146-150) */
.profile-hero__portrait:focus-visible .profile-hero__zoom {
  opacity: 1;
  translate: -50% 0;
}

@media (hover: hover) and (pointer: fine) {
  .profile-hero__portrait:hover .profile-hero__zoom {
    opacity: 1;
    translate: -50% 0;
  }
}
```

```css
/* target — src/styles/profile.css (replaces 896-900) */
.photo-grid__item:focus-visible .photo-grid__caption {
  opacity: 1;
  translate: 0 0;
}

@media (hover: hover) and (pointer: fine) {
  .photo-grid__item:hover .photo-grid__caption {
    opacity: 1;
    translate: 0 0;
  }
}
```

Adjacent rules may share one media block. Wrap the two hero-stack rules (home.css:311-322) together and
the two pager icon rules (profile.css:1024-1030) together.

## Repo conventions to follow

- Media queries in this codebase are written inline at the point of use, with plain `@media (…)` blocks and
  2-space indentation inside. Exemplar: `src/styles/aurora.css:75-79`.
- The media query text must be exactly `(hover: hover) and (pointer: fine)` to match `dogCard.js:66`.

## Steps

1. **`src/styles/components.css`**: wrap the three rules at 593-595, 615-617 and 781-783, each in its own
   `@media (hover: hover) and (pointer: fine) { … }` block, in place.
2. **`src/styles/home.css`**: split 209-213 as shown in *Target*. Wrap 311-322, both hero-stack rules, in one
   media block, in place.
3. **`src/styles/profile.css`**:
   - wrap 74-76;
   - split 146-150 and 896-900 as shown in *Target*;
   - wrap 876-878, 922-925 and 957-960, each in place;
   - wrap 983-986;
   - wrap 1024-1030 in one block.
4. Leave all other `:hover` rules (pure colour, background or border changes) untouched.

## Boundaries

- Do NOT change any property values or selectors, beyond splitting the three shared selector lists.
- Do NOT gate `:active` press rules or `:focus-visible` rules. Those must work everywhere.
- Do NOT touch `src/components/dogCard.js`.
- Do NOT move rules to another place in the file. Wrap them where they are.
- If a quoted rule doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors. Then run:

  ```bash
  grep -c "(hover: hover) and (pointer: fine)" src/styles/components.css src/styles/home.css src/styles/profile.css
  ```

  Expected counts: components.css 3, home.css 2, profile.css 8.
- **Feel check**: run `npm run dev`.
  - With a mouse, everything behaves exactly as before:
    - card photo zoom, spotlight and arrow nudge;
    - hero stack fan-out;
    - portrait lift and zoom pill;
    - profile photo zoom and caption;
    - pack-mate and pager lifts.
  - In DevTools, turn on device emulation (e.g. iPhone 14, touch). Tap a card's **Gallery** button, then
    close the gallery. The card's photo is not zoomed and there is no glow blob in its corner.
  - Same emulation: on a profile, tap a photo in the photo grid and close the gallery. The photo is not stuck
    zoomed.
  - Keyboard: Tab onto a profile photo. Its caption still appears (`:focus-visible`). In the search popover,
    press ↓. The active option still shows its arrow (`.is-active`).
- **Done when**: no hover-driven movement, zoom or spotlight shows on touch emulation, mouse and keyboard
  behaviour is unchanged, and the build passes.
