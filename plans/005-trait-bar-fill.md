# 005 — Temperament bars: fill with a clip reveal instead of scaleX

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (`src/styles/profile.css`); ~6 lines

## Problem

The temperament meters on a dog's profile (Energy, Independence, Playfulness…) fill by scaling the coloured
bar horizontally:

```css
/* src/styles/profile.css:633-647 — current */
.trait__bar span {
  display: block;
  width: calc(var(--v) * 100%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 0 16px -2px var(--accent-1);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform calc(var(--spring-duration) * 1.6) var(--spring);
}

.is-visible .trait__bar span {
  transform: scaleX(1);
}
```

`scaleX` also squashes the bar's rounded leading end and stretches the gradient. For most of the ~0.8s fill,
the end is a flat, sharp sliver that only becomes round at the very end. Real liquid filling a tube keeps
its rounded front.

## Target

The bar keeps its final size and gradient, and is **revealed** left-to-right with a rounded clip. The front
stays round the whole time, and the gradient stays put, so the motion reads as filling.

```css
/* target — src/styles/profile.css */
.trait__bar span {
  display: block;
  width: calc(var(--v) * 100%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
  box-shadow: 0 0 16px -2px var(--accent-1);
  /* Revealed, not stretched: the rounded front and the gradient stay intact while it fills */
  clip-path: inset(0 100% 0 0 round 999px);
  transition: clip-path calc(var(--spring-duration) * 1.6) var(--spring);
}

.is-visible .trait__bar span {
  clip-path: inset(0 0 0 0 round 999px);
}
```

Same timing, same staggered `transition-delay`s (the `.trait:nth-child(n) .trait__bar span` rules) and same
spring. Only the animated property changes. A `clip-path` transition repaints, but these bars are 0.5rem
tall, so the cost is negligible.

## Repo conventions to follow

- Motion keeps using the spring tokens `var(--spring-duration)` / `var(--spring)`. Don't introduce a curve here.
- Reduced motion is handled globally in `src/styles/base.css` by restricting `transition-property` to opacity
  and colours. `clip-path` isn't in that list, so with reduced motion the bars appear full instantly. That's
  correct, and nothing needs adding.

## Steps

1. **`src/styles/profile.css`**: in `.trait__bar span`, delete the three lines `transform-origin: left;`,
   `transform: scaleX(0);` and `transition: transform calc(var(--spring-duration) * 1.6) var(--spring);`.
   In their place, put the comment plus the `clip-path` and `transition` lines from *Target*.
2. **`src/styles/profile.css`**: in `.is-visible .trait__bar span`, replace `transform: scaleX(1);` with
   `clip-path: inset(0 0 0 0 round 999px);`.

## Boundaries

- Do NOT change the `transition-delay` rules for `.trait:nth-child(2…6)`.
- Do NOT change `.trait__bar` (the track) or any markup.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
  `grep -n "scaleX" src/styles/profile.css` prints nothing.
- **Feel check**: run `npm run dev`, open any dog's profile and scroll to **Temperament**.
  - The bars fill left-to-right one after another, as before.
  - In DevTools → Animations, set playback to 10%. The front of every bar is round throughout. The gradient
    does not stretch, and the right-hand colour appears only as the bar reaches it.
  - The final state is identical to before: same lengths, same glow.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce` and reload. The bars are simply full,
    with no animation.
- **Done when**: the bars fill via `clip-path`, the leading edge is always round, and the build passes.
