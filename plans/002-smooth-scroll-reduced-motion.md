# 002 — Programmatic scrolls: respect reduced motion; the `/` shortcut jumps instantly

- **Status**: TODO
- **Commit**: d494e09
- **Severity**: MEDIUM
- **Category**: Accessibility; Purpose & frequency
- **Estimated scope**: 3 files (`src/components/header.js`, `src/main.js`, `src/pages/dog.js`); ~10 lines

## Problem

Two `scrollIntoView` calls always ask for `behavior: 'smooth'`:

```js
/* src/components/header.js:48-58 — current */
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
```

```js
/* src/pages/dog.js:359-363 — current (profile buttons "Read the story" / "See in 3D") */
    const s = ev.target.closest('[data-scroll]');
    if (s) {
      ev.preventDefault();
      document.getElementById(s.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
```

```js
/* src/main.js:86-93 — current: the global "/" keyboard shortcut */
// Global "/" shortcut focuses the search bar
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isGalleryOpen()) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  e.preventDefault();
  focusSearch();
});
```

Why it matters:

1. **Reduced motion is ignored.** The stylesheet's reduced-motion block sets `scroll-behavior: auto !important`,
   but that only governs `behavior: 'auto'`. An explicit `behavior: 'smooth'` always animates, so
   reduced-motion users still get long smooth scrolls.
2. **A keyboard shortcut animates.** Keyboard shortcuts should never animate. Pressing `/` from far down the
   page glides the whole page up instead of jumping straight to the field.

## Target

- `focusSearch({ instant = false } = {})` scrolls with `behavior: 'auto'` (an instant jump) when `instant` is
  true or reduced motion is on. Otherwise it scrolls with `'smooth'`.
- The `/` shortcut calls `focusSearch({ instant: true })`. A click on the header's Search button still
  glides, unless reduced motion is on.
- The profile `[data-scroll]` buttons glide, unless reduced motion is on.

## Repo conventions to follow

- `prefersReducedMotion()` is exported from `src/lib/utils.js`.
- This codebase already does it right in two places. Imitate them exactly:
  - `src/pages/home.js:359`: `$('#pack', app).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });`
  - `src/components/gallery.js:202`:
    `thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });`

## Steps

1. **`src/components/header.js`**: after the existing line `import { uiState } from '../lib/state.js';`, add:

   ```js
   import { prefersReducedMotion } from '../lib/utils.js';
   ```
2. **`src/components/header.js`**: replace the whole `focusSearch` function and its doc comment (quoted above)
   with:

   ```js
   /**
    * Focuses the home search bar, navigating home first if needed.
    * A click glides there; keyboard shortcuts (`instant`) and reduced motion jump.
    */
   export function focusSearch({ instant = false } = {}) {
     const input = document.getElementById('dog-search');
     if (input) {
       input.scrollIntoView({ behavior: instant || prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
       input.focus({ preventScroll: true });
       return;
     }
     uiState.focusSearchOnHome = true;
     location.hash = '#/';
   }
   ```
3. **`src/main.js`**: in the `/` keydown listener, change `focusSearch();` to:

   ```js
     focusSearch({ instant: true }); // keyboard shortcuts never animate
   ```
4. **`src/pages/dog.js`**: change the import line
   `import { $, dogAge, escapeHtml, formatDate } from '../lib/utils.js';` to:

   ```js
   import { $, dogAge, escapeHtml, formatDate, prefersReducedMotion } from '../lib/utils.js';
   ```
5. **`src/pages/dog.js`**: change the `[data-scroll]` line to:

   ```js
         document
           .getElementById(s.dataset.scroll)
           ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
   ```

## Boundaries

- Do NOT change the other `focusSearch()` caller (the header Search button click in `header.js`). It keeps
  gliding by default.
- Do NOT add `scroll-behavior` rules to CSS.
- Do NOT touch `home.js` or `gallery.js`. They already do this correctly.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
  `grep -rn "behavior: 'smooth'" src` prints nothing. Every smooth scroll is now conditional.
- **Feel check**: run `npm run dev`.
  - On the home page, scroll down to the dog grid and press `/`. The page jumps instantly to the search field,
    which is focused. There is no glide.
  - Scroll down again and click **Search** in the header. The page glides up to the field.
  - On a profile, click **Read the story**. It glides to the story.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. The header Search button and
    **Read the story** now jump instantly.
- **Done when**: no unconditional `behavior: 'smooth'` remains, `/` never animates, and the build passes.
