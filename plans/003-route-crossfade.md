# 003 — Route crossfade: strong ease-out and a 2px blur mask

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: LOW
- **Category**: Easing & duration; Cohesion
- **Estimated scope**: 1 file (`src/styles/base.css`), plus the `--ease-out` token from plan 001; ~25 lines

## Problem

Every route change (card → profile, profile → home, profile pager, "Random husky") runs inside a View
Transition (`withViewTransition` in `src/lib/utils.js`). The page-level crossfade uses the browser's built-in
`ease`:

```css
/* src/styles/base.css:153-157 — current */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.28s;
  animation-timing-function: ease;
}
```

Why it matters:

1. Built-in `ease` is weak and symmetric. A page swap is an exit plus an entrance, and those should be
   ease-out: the old page gets out of the way fast and the new one settles in.
2. For most of the 280ms both pages are partly visible on top of each other: two different layouts, two sets
   of text. This double exposure reads as a glitch. A subtle `blur(2px)` during the crossfade masks it.

Feel can't be fully judged from code. That's why the feel-check below is mandatory.

## Target

```css
/* target — src/styles/base.css, replacing the rule quoted above */
::view-transition-image-pair(root) {
  isolation: isolate;
}

::view-transition-old(root),
::view-transition-new(root) {
  /*
   * Our own fade replaces the browser's, so keep its additive blend: with the
   * same curve on both, the two pages always add up to full opacity and the
   * background never dims mid-fade.
   */
  mix-blend-mode: plus-lighter;
}

/* A 2px blur masks the moment both pages show at once */
::view-transition-old(root) {
  animation: vt-fade-out 0.28s var(--ease-out) both;
}

::view-transition-new(root) {
  animation: vt-fade-in 0.28s var(--ease-out) both;
}

@keyframes vt-fade-out {
  to {
    opacity: 0;
    filter: blur(2px);
  }
}

@keyframes vt-fade-in {
  from {
    opacity: 0;
    filter: blur(2px);
  }
}
```

The `dog-hero` morph rules below it (`::view-transition-group(dog-hero)`, `::view-transition-old(dog-hero)`,
`::view-transition-new(dog-hero)`) stay exactly as they are.

## Repo conventions to follow

- Easing tokens live in the Motion block of `src/styles/tokens.css`. Plan 001 adds
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` there. If it is missing, add exactly this after
  `--spring-duration: 0.5s;`:

  ```css
    /* Strong ease-out for things entering or leaving on a fixed duration (fades, exits) */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  ```
- Tokens already work inside view-transition pseudo-elements. Exemplar: `src/styles/base.css:159-163`
  `::view-transition-group(dog-hero) { animation-timing-function: var(--spring); … }`.
- Keep the existing comment block above the view-transition rules (`/* Route changes cross-fade the whole page … */`).

## Steps

1. Make sure `--ease-out` exists in `src/styles/tokens.css` (see conventions).
2. **`src/styles/base.css`**: replace the `::view-transition-old(root), ::view-transition-new(root) { … }` rule
   (quoted in *Problem*) with the *Target* CSS, verbatim. Put the two `@keyframes` directly after the
   `::view-transition-new(root)` rule, before `::view-transition-group(dog-hero)`.

## Boundaries

- Do NOT touch the `dog-hero` rules or `withViewTransition` in `src/lib/utils.js`.
- Do NOT add a `view-transition-name` to any element.
- Do NOT raise the blur above 2px. Heavy blur on a full-screen snapshot is expensive, and the mask only needs
  to be subtle.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
- **Feel check**: in Chrome, run `npm run dev`.
  - Click a dog card. The page swap is quick, and the new page lands softly. At no point can you read both
    pages' text at once. Mid-swap it's briefly soft, never doubled.
  - The background (aurora and stars) does not dim or flash during the swap. If it does, the
    `plus-lighter` / `isolation` rules are missing or misspelled.
  - The dog's photo still morphs from the card into the profile portrait, and back when you return home.
  - In DevTools → Animations, set playback to 10% and step through a route change. You see `vt-fade-out` and
    `vt-fade-in`, both with `cubic-bezier(0.23, 1, 0.32, 1)`, and the blur never exceeds 2px.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. Route changes are instant with no
    crossfade. That's the existing behaviour from `withViewTransition`, unchanged.
- **Done when**: the root crossfade uses `var(--ease-out)` with the 2px blur mask, the background never dims
  mid-swap, the hero morph still works, and the build passes.
