# 007 — Filtering: cards that drop out fade away instead of vanishing

- **Status**: TODO
- **Commit**: d494e09
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (`src/pages/home.js`, `src/styles/components.css`); ~35 lines

## Problem

On the home page, the dog grid re-renders whenever a filter chip, the sort or the search changes:

```js
/* src/pages/home.js:228-262 — current (inside update()) */
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
        // `translate` (not `transform`) so the pointer-driven tilt keeps working mid-move
        card.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
          duration: REFLOW ? REFLOW.duration * 1000 : 600,
          easing: REFLOW ? REFLOW.easing : 'cubic-bezier(0.25, 1, 0.5, 1)',
        });
      }
    });
```

Cards that stay glide to their new slots (FLIP), and new cards fade in with a stagger (`card-in`). Cards that
**leave** simply disappear on the frame `innerHTML` is replaced. The remaining cards then glide into space
that went empty instantly, so the eye sees a hole open with nothing explaining where the dog went.

## Target

Each leaving card stays where it was, out of the layout, and fades out: `opacity 1 → 0` and `scale 1 → 0.96`
over **150ms**, with the strong ease-out curve `cubic-bezier(0.23, 1, 0.32, 1)`. Then it is removed. It sits
underneath the cards gliding over its spot, and it is inert: no pointer events, no focus, hidden from
assistive tech. The fade-out uses no movement other than that subtle scale, and is skipped entirely under
reduced motion (the existing `!reduced` guard).

```css
/* target — src/styles/components.css */
.dog-grid {
  position: relative; /* anchors cards that are fading out (filtering) */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16.75rem, 1fr));
  gap: 1.5rem;
}

/* A card that just dropped out of the grid: pinned where it stood while it fades away */
.dog-card--ghost {
  position: absolute;
  pointer-events: none;
  animation: none;
}
```

```js
/* target — src/pages/home.js, the same part of update() */
    if (ids === renderedIds) return;

    const before = new Map();
    const leaving = [];
    if (renderedIds && !reduced) {
      const next = new Set(list.map((d) => d.id));
      $$('.dog-card:not(.dog-card--ghost)', grid).forEach((c) => {
        const rect = c.getBoundingClientRect();
        before.set(c.dataset.id, rect);
        if (!next.has(c.dataset.id)) leaving.push({ card: c, rect });
      });
    }
    renderedIds = ids;
    grid.innerHTML = list.map((d, i) => dogCard(d, i)).join('');
    if (!before.size) return;

    let fresh = 0;
    $$('.dog-card', grid).forEach((card) => {
      /* …unchanged FLIP loop… */
    });

    // Cards that dropped out fade away where they stood instead of vanishing
    const origin = grid.getBoundingClientRect();
    leaving.forEach(({ card, rect }) => {
      card.getAnimations().forEach((a) => a.cancel()); // e.g. a reflow still in flight
      card.classList.add('dog-card--ghost');
      card.inert = true;
      card.setAttribute('aria-hidden', 'true');
      Object.assign(card.style, {
        left: `${rect.left - origin.left}px`,
        top: `${rect.top - origin.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transform: '',
        willChange: '',
      });
      grid.prepend(card); // painted under the cards gliding over its spot
      card.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.96 }], {
        duration: 150,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fill: 'forwards',
      }).onfinish = () => card.remove();
    });
```

Notes for the executor:

- `rect` is measured before `innerHTML` is replaced, so it is the card's on-screen box at that moment,
  including any reflow still in flight. Cancelling that animation and pinning the ghost to `rect` means it
  starts exactly where the user last saw it.
- Absolutely positioned children of a grid don't take part in grid placement, so `prepend` doesn't shift the
  real cards. No `:nth-child` selectors target `.dog-card`.
- If another filter change arrives within the 150ms, `innerHTML` simply replaces the grid, ghosts included.
  That's acceptable.

## Repo conventions to follow

- WAAPI is already used for grid motion in this same function: `card.animate([...], { duration, easing })`
  for the FLIP. Imitate that style.
- Modifier classes on cards use `dog-card--*` (exemplar: `.dog-card--static` in
  `src/styles/components.css`, which also sets `animation: none`). Put the new `.dog-card--ghost` rule directly
  after the `.dog-card--static` rule.
- Reduced motion is already respected by the `if (renderedIds && !reduced)` guard. Under reduced motion
  `leaving` stays empty and nothing changes.

## Steps

1. **`src/styles/components.css`**: in `.dog-grid` (currently `display: grid; grid-template-columns: …; gap: 1.5rem;`),
   add `position: relative;` as the first declaration, with the comment shown in *Target*.
2. **`src/styles/components.css`**: directly after the `.dog-card--static { animation: none; }` rule, add the
   `.dog-card--ghost` rule from *Target*, including its comment.
3. **`src/pages/home.js`**: in `update()`, replace the `const before = new Map(); if (renderedIds && !reduced) { … }`
   block with the version from *Target*, which also collects `leaving` and skips ghosts.
4. **`src/pages/home.js`**: after the FLIP `forEach` loop ends, still inside `update()`, add the
   `// Cards that dropped out…` block from *Target*.

## Boundaries

- Do NOT change the FLIP loop, the `card-in` entrance or `dogCard()` markup.
- Do NOT add exit animations anywhere else (search popover and empty state are separate plans).
- Do NOT add dependencies.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
- **Feel check**: run `npm run dev` and open the home page with the dog grid in view.
  - Click the **Girls** chip. The boys fade out in place (a quick fade with a slight shrink) while the girls
    glide into their new slots. No card blinks out of existence.
  - Click **All**. The boys fade back in with the existing stagger, and nothing is left behind.
  - Type `zzz` in the search. Every card fades out and the "Nobody matches" message appears.
  - In DevTools → Animations, set playback to 10%. The leaving cards stay exactly where they were (no jump)
    and sit *under* the cards moving across them.
  - Click chips rapidly back and forth. Nothing gets stuck: no half-transparent cards remain, and the
    `.dog-card--ghost` count in Elements returns to 0.
  - Tab through the grid during a fade. Focus never lands on a fading card.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. Filtering swaps cards instantly, as
    before.
- **Done when**: leaving cards fade out in place and are removed, nothing is focusable or clickable during
  the fade, and the build passes.
