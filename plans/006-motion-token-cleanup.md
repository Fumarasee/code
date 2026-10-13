# 006 — Fold the stray hand-typed motion values into the motion system

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 3 files (`src/styles/aurora.css`, `src/styles/home.css`, `src/styles/profile.css`), plus the `--ease-out` token from plan 001; 4 one-line edits

## Problem

Almost all motion in this codebase goes through the tokens in `src/styles/tokens.css`. Four declarations
bypass them with hand-typed values:

```css
/* src/styles/aurora.css:38 — current: a hand-typed copy of the --spring fallback curve */
  transition: translate 1.4s cubic-bezier(0.25, 1, 0.5, 1);
```

```css
/* src/styles/home.css:150-160 — current: the search suggestion row */
.search__option {
  …
  transition:
    scale var(--spring-duration) var(--spring),
    background-color 120ms ease;
}
```

```css
/* src/styles/profile.css:320-332 — current: the 3D viewer's loading overlay fading away */
.viewer__loading {
  …
  transition: opacity 0.4s ease;
}
```

```css
/* src/styles/profile.css:715-731 — current: habit rows sliding in */
.habit-list li {
  …
  transition:
    opacity var(--spring-duration) ease,
    translate var(--spring-duration) var(--spring);
  transition-delay: calc(var(--i) * 50ms + 120ms);
}
```

Why each one matters:

1. **aurora.css:38**: the curve is the `--spring` fallback, typed out by hand. In browsers with `linear()`
   support, `main.js` swaps `--spring` for the real spring, and this copy drifts away from the rest of the
   motion.
2. **home.css:159**: the suggestion highlight follows the pointer and the ↑/↓ keys. That is list navigation,
   one of the most frequent interactions on the page. Highlight changes there should be **instant**: no
   transition at all, rather than a near-copy of `--fade`.
3. **profile.css:331**: a 400ms `ease` exit is above the 300ms UI budget, and exits should be ease-out.
4. **profile.css:727**: the opacity of an entrance runs on built-in `ease` while its movement rides the
   spring. The rest of the codebase fades entrances on the spring too.

## Target

```css
/* target — src/styles/aurora.css:38 */
  transition: translate 1.4s var(--spring);
```

```css
/* target — src/styles/home.css, .search__option */
  transition: scale var(--spring-duration) var(--spring);
```

```css
/* target — src/styles/profile.css, .viewer__loading */
  transition: opacity 250ms var(--ease-out);
```

```css
/* target — src/styles/profile.css, .habit-list li */
  transition:
    opacity var(--spring-duration) var(--spring),
    translate var(--spring-duration) var(--spring);
```

## Repo conventions to follow

- Tokens: `--spring` / `--spring-duration` for movement and entrances, `--fade` for hover colour changes,
  `--press` for pointer-down feedback, and `--ease-out` (added by plan 001) for fixed-duration exits.
  If `--ease-out` is missing from the Motion block in `src/styles/tokens.css`, add exactly this after
  `--spring-duration: 0.5s;`:

  ```css
    /* Strong ease-out for things entering or leaving on a fixed duration (fades, exits) */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  ```
- Exemplar of an entrance fading on the spring: `src/styles/base.css` `.reveal.is-visible { animation: reveal-in var(--spring-duration) var(--spring) both; }`.
  Its keyframes move `opacity` and `translate` together.

## Steps

1. **`src/styles/aurora.css`**: in `.aurora__gl`, replace `transition: translate 1.4s cubic-bezier(0.25, 1, 0.5, 1);`
   with `transition: translate 1.4s var(--spring);`.
2. **`src/styles/home.css`**: in `.search__option`, replace the two-line `transition:` declaration with the
   single line `transition: scale var(--spring-duration) var(--spring);`.
3. **`src/styles/profile.css`**: in `.viewer__loading`, replace `transition: opacity 0.4s ease;` with
   `transition: opacity 250ms var(--ease-out);`.
4. **`src/styles/profile.css`**: in `.habit-list li`, replace `opacity var(--spring-duration) ease,` with
   `opacity var(--spring-duration) var(--spring),`.

## Boundaries

- Do NOT change any other transition, duration or token value.
- Do NOT touch `src/main.js` or `src/lib/spring.js`.
- If a quoted line doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors. Then run:

  ```bash
  grep -n -E "120ms ease|0\.4s ease|spring-duration\) ease|1\.4s cubic-bezier" src/styles/*.css
  ```

  Expected: no output. None of the four old values remains.
- **Feel check**: run `npm run dev`.
  - Move the mouse across the page. The aurora parallax still drifts after the pointer with a long, soft lag.
  - Type `a` in the search and hover or arrow through the suggestions. The highlight jumps instantly from row
    to row, while the arrow on the active row still slides in.
  - Open a profile. The 3D loader fades out quickly (≈¼ s) when the scene is ready.
  - Scroll to **Habits**. The rows still slide and fade in one after another.
- **Done when**: all four values use tokens, or no transition in the case of `.search__option`, and the
  build passes.
