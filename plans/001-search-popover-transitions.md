# 001 — Make the search popover interruptible and exit with ease-out

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: HIGH
- **Category**: Easing & duration; Interruptibility
- **Estimated scope**: 3 files (`src/styles/tokens.css`, `src/styles/home.css`, `src/pages/home.js`), plus deleting one unused keyframe in `src/styles/base.css`; ~40 lines

## Problem

The search suggestions popover (home page, under the search field) opens and closes with CSS **keyframes**,
and closes with **`ease-in`**:

```css
/* src/styles/home.css:124-147 — current */
/* The popover grows out of the field it belongs to and returns into it */
.search__suggestions {
  position: absolute;
  top: calc(100% + 0.625rem);
  left: 0;
  right: 0;
  max-height: 27.5rem;
  overflow: auto;
  margin: 0;
  padding: 0.5rem;
  list-style: none;
  border-radius: var(--radius-l);
  transform-origin: 50% 0;
  animation: materialize-in var(--spring-duration) var(--spring);
}

.search__suggestions.is-leaving {
  animation: materialize-out 160ms ease-in forwards;
  pointer-events: none;
}

.search__suggestions[hidden] {
  display: none;
}
```

```js
/* src/pages/home.js:280-299 — current */
  /** The popover returns into the field it came from (same path out as in). */
  function hideSuggestions() {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    if (suggestionsEl.hidden || suggestionsEl.classList.contains('is-leaving')) return;
    if (reduced) {
      suggestionsEl.hidden = true;
      return;
    }
    suggestionsEl.classList.add('is-leaving');
    suggestionsEl.addEventListener(
      'animationend',
      () => {
        if (!suggestionsEl.classList.contains('is-leaving')) return;
        suggestionsEl.classList.remove('is-leaving');
        suggestionsEl.hidden = true;
      },
      { once: true },
    );
  }
```

```js
/* src/pages/home.js:324-325 — current (inside renderSuggestions) */
    suggestionsEl.classList.remove('is-leaving');
    suggestionsEl.hidden = false;
```

Why it matters:

1. `ease-in` starts slowly, which delays the exact moment the user is watching. Exits must be ease-out.
2. Keyframes restart from zero. If the popover is reopened while it is closing (delete the last letter and
   type a new one, or blur and click back into the field within 160ms), `renderSuggestions` removes
   `.is-leaving`. The `materialize-in` keyframes then restart from `opacity: 0`, so a half-faded popover snaps
   to invisible and fades in again. The result is a visible flicker. CSS transitions instead retarget from
   the current on-screen value.

## Target

- A new strong ease-out token: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- Entry: the same motion as today (opacity, scale 0.96 → 1 and blur 6px → 0 on the existing spring), but
  done as a **transition** that starts from `@starting-style`.
- Exit: opacity → 0, `scale(0.97)`, `blur(4px)` over **150ms `var(--ease-out)`**.
- Reopening mid-exit continues from the current values. There is no restart from zero.

```css
/* target — src/styles/home.css */
/*
 * The popover grows out of the field it belongs to and returns into it.
 * Transitions, not keyframes: reopening it mid-exit continues from where it is.
 */
.search__suggestions {
  position: absolute;
  top: calc(100% + 0.625rem);
  left: 0;
  right: 0;
  max-height: 27.5rem;
  overflow: auto;
  margin: 0;
  padding: 0.5rem;
  list-style: none;
  border-radius: var(--radius-l);
  transform-origin: 50% 0;
  transition:
    opacity var(--spring-duration) var(--spring),
    transform var(--spring-duration) var(--spring),
    filter var(--spring-duration) var(--spring);
}

/* Where it grows from each time it appears (display: none → shown) */
@starting-style {
  .search__suggestions {
    opacity: 0;
    transform: scale(0.96);
    filter: blur(6px);
  }
}

.search__suggestions.is-leaving {
  opacity: 0;
  transform: scale(0.97);
  filter: blur(4px);
  pointer-events: none;
  transition:
    opacity 150ms var(--ease-out),
    transform 150ms var(--ease-out),
    filter 150ms var(--ease-out);
}

.search__suggestions[hidden] {
  display: none;
}
```

## Repo conventions to follow

- Motion tokens live in the `/* Motion. … */` block of `src/styles/tokens.css` (`--spring`, `--spring-duration`,
  `--press`, `--fade`). Add `--ease-out` there, after `--spring-duration`.
- Springs are the default for movement (`var(--spring-duration) var(--spring)`). Fixed-duration curves are
  only for short fades and exits. Exemplar: `src/styles/components.css:119`
  `transition: scale var(--press);`.
- Under `prefers-reduced-motion`, `hideSuggestions` already hides instantly (`if (reduced) { … }`). Keep that.

## Steps

1. **`src/styles/tokens.css`**: in the Motion block, directly after the line `--spring-duration: 0.5s;`, add:

   ```css
     /* Strong ease-out for things entering or leaving on a fixed duration (fades, exits) */
     --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
   ```

   Skip this step if `--ease-out` already exists with exactly this value.
2. **`src/styles/home.css`**: replace the three rules quoted in *Problem* (from the comment
   `/* The popover grows out of the field…` through `.search__suggestions[hidden] { display: none; }`) with the
   *Target* CSS above, verbatim.
3. **`src/pages/home.js`**: in the `/* --- search + suggestions --- */` section, find the lines
   `let activeIndex = -1;` and `let suggestions = [];`. Directly after them, add:

   ```js
     let leaveTimer = 0;

     /** Ends the exit: the popover is only really hidden once it has faded out. */
     function finishLeaving() {
       clearTimeout(leaveTimer);
       if (!suggestionsEl.classList.contains('is-leaving')) return;
       suggestionsEl.classList.remove('is-leaving');
       suggestionsEl.hidden = true;
     }
     // Children's transitions bubble up here too — only the popover's own fade counts
     suggestionsEl.addEventListener('transitionend', (e) => {
       if (e.target === suggestionsEl && e.propertyName === 'opacity') finishLeaving();
     });
   ```
4. **`src/pages/home.js`**: in `hideSuggestions()`, replace everything from
   `suggestionsEl.classList.add('is-leaving');` to the end of the `addEventListener('animationend', …)` call
   with:

   ```js
       suggestionsEl.classList.add('is-leaving');
       // Safety net: no transitionend fires if it was already transparent
       clearTimeout(leaveTimer);
       leaveTimer = setTimeout(finishLeaving, 250);
   ```
5. **`src/pages/home.js`**: in `renderSuggestions()`, directly before
   `suggestionsEl.classList.remove('is-leaving');`, add `clearTimeout(leaveTimer);`.
6. **`src/styles/base.css`**: run `grep -rn "materialize-out" src`. If the only remaining match is the
   `@keyframes materialize-out { … }` block in `base.css`, delete that block, all 7 lines. Keep
   `@keyframes materialize-in`, because `.search__clear` still uses it.

## Boundaries

- Do NOT touch `.search__clear`, `.search__option` or any other search styles.
- Do NOT change the reduced-motion block in `src/styles/base.css`. Its
  `.search__suggestions { animation: fade-in … }` override stays: it gives reduced-motion users a plain fade.
- Do NOT change markup or the suggestion rendering/ranking logic.
- Do NOT add dependencies.
- If the quoted code doesn't match what you find (drift since `d494e09`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
  `grep -rn "ease-in[^-]" src/styles` prints nothing.
- **Feel check**: run `npm run dev`, then type `lu` into the home search field.
  - The popover still grows from the field: it fades in, scales from 0.96 and sharpens from a blur, with no
    overshoot.
  - Click outside: it fades out quickly (150ms) and starts fast. It does not hang at the start.
  - Type `l`, press Backspace, and immediately type `u` again. The popover never blinks to invisible and back.
    It continues from wherever it was.
  - Blur and click back into the field within ~100ms. Same: it continues, with no restart.
  - In DevTools → Animations, set playback to 10% and repeat the Backspace test. The opacity reverses
    smoothly from its current value.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. The popover appears with a plain fade
    and disappears instantly, with no scale or blur.
  - After closing, `#search-suggestions` has the `hidden` attribute (check in Elements).
- **Done when**: none of the search popover rules use `@keyframes` or `ease-in`, reopening mid-exit never
  flickers, and the build passes.
