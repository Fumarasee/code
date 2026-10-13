# 008 — Empty state: ease in instead of popping into place

- **Status**: DONE
- **Commit**: d494e09
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 1 file (`src/styles/components.css`), plus the `--ease-out` token from plan 001; ~12 lines

## Problem

When a search or filter matches no dogs, the home page shows the "Nobody matches…" glass panel. It is toggled
with the `hidden` attribute and has no motion at all, so it pops in on the same frame the last card
disappears:

```js
/* src/pages/home.js:224 — current (inside update()) */
    emptyEl.hidden = list.length > 0;
```

```css
/* src/styles/components.css:786-797 — current */
.empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 3.5rem 1.5rem;
  border-radius: var(--radius-l);
  text-align: center;
}

.empty[hidden] {
  display: none;
}
```

## Target

Each time the panel appears, it fades in over 200ms with `var(--ease-out)` and rises `0.75rem` on the
spring, the same rise distance as the site's `reveal-in` entrance. When it is hidden, it leaves instantly,
which is fine because the results that replace it are what the eye goes to.

```css
/* target — src/styles/components.css */
.empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 3.5rem 1.5rem;
  border-radius: var(--radius-l);
  text-align: center;
  transition:
    opacity 200ms var(--ease-out),
    translate var(--spring-duration) var(--spring);
}

/* Each time it appears (display: none → shown) it eases in from just below */
@starting-style {
  .empty {
    opacity: 0;
    translate: 0 0.75rem;
  }
}

.empty[hidden] {
  display: none;
}
```

This uses CSS transitions with `@starting-style`, not keyframes, so the global reduced-motion rule in
`src/styles/base.css` handles it automatically. That rule restricts `transition-property` to opacity and
colours, so reduced-motion users get the fade without the rise. Browsers without `@starting-style` show the
panel instantly, as today.

## Repo conventions to follow

- Entrance distance `0.75rem` and the spring come from the existing reveal entrance. Exemplar,
  `src/styles/base.css`:

  ```css
  @keyframes reveal-in {
    from {
      opacity: 0;
      translate: 0 0.75rem;
    }
    …
  }
  ```
- `--ease-out` is added by plan 001. If it is missing from the Motion block of `src/styles/tokens.css`, add
  exactly this after `--spring-duration: 0.5s;`:

  ```css
    /* Strong ease-out for things entering or leaving on a fixed duration (fades, exits) */
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  ```
- `.empty` is a glass panel (`class="empty glass"`). Animating `opacity` on the glass element **itself** is
  safe. Never put the opacity on a wrapper around it: an ancestor with opacity < 1 cuts off `backdrop-filter`
  (see the comment above `.reveal` in `src/styles/base.css`).

## Steps

1. Make sure `--ease-out` exists in `src/styles/tokens.css` (see conventions).
2. **`src/styles/components.css`**: add the `transition` declaration to the `.empty` rule, and add the
   `@starting-style` block with its comment between `.empty { … }` and `.empty[hidden] { … }`, exactly as in
   *Target*.

## Boundaries

- Do NOT touch `src/pages/home.js`. The `hidden` toggle stays as it is.
- Do NOT add an exit animation for the panel.
- Do NOT change `.empty__icon` / `.empty__text`.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
- **Feel check**: run `npm run dev` and open the home page.
  - Type `zzz` into the search. The "Nobody matches" panel fades in and rises softly into place. It doesn't
    pop.
  - Keep typing (`zzzz`). The panel stays put without re-animating, because it was already shown.
  - Clear the search. The panel disappears and the cards return.
  - In DevTools → Animations, set playback to 10% and repeat. The panel's blur (glass) is visible throughout
    the fade; it isn't a flat box that suddenly turns frosted.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. The panel fades in without moving.
- **Done when**: the empty state eases in on every appearance, reduced motion keeps only the fade, and the
  build passes.
