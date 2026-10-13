# 009 — Gallery: crossfade the ambient glow and fade in the caption on photo change

- **Status**: TODO
- **Commit**: d494e09
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 1 file (`src/components/gallery.js`); ~20 lines

## Problem

In the gallery overlay, changing photos (swipe, ←/→, thumbnails, prev/next buttons) glides the photo track
on a spring. At the same moment, two things around it **teleport**:

```js
/* src/components/gallery.js:189-203 — current */
  function updateUI() {
    const photo = photos[index];
    caption.textContent = photo.caption;
    counter.textContent = `Photo ${index + 1} of ${photos.length}`;
    ambient.style.backgroundImage = `url("${photo.src}")`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === last;
    slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i !== index)));
    thumbs.forEach((t, i) => {
      const on = i === index;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
```

- `.gallery__ambient` is a large, blurred copy of the current photo behind the stage
  (`filter: blur(60px) saturate(150%); opacity: 0.5;` in `src/styles/gallery.css`). Its colour field swaps on
  a single frame while the photo is still sliding, which reads as a flash.
- The caption text under the photo swaps instantly mid-slide.

`updateUI()` is called from three places:

- `go()` at `src/components/gallery.js:216`, when the photo changes or the spring re-settles;
- line 396, once on open;
- nowhere else.

```js
/* src/components/gallery.js:206-218 — current */
  /** Go to a photo. `flick` adds a little bounce — only when the gesture had momentum. */
  function go(i, { velocity, flick = false } = {}) {
    const next = Math.min(Math.max(0, i), last);
    const changed = next !== index;
    index = next;
    if (reduced) {
      trackX.set(-index * width);
      if (changed) images[index].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    } else {
      trackX.to(-index * width, { damping: flick ? 0.85 : 1, response: flick ? 0.34 : 0.38, velocity });
    }
    updateUI();
    return changed;
  }
```

## Target

When, and only when, the photo actually changes:

- **Ambient glow**: crossfades over **250ms** with `cubic-bezier(0.23, 1, 0.32, 1)`. A shallow clone of the
  ambient layer keeps the old image and fades to 0 on top of it, then is removed. The real layer gets the new
  image and fades in from 0 to its CSS opacity.
- **Caption**: the new text fades in from 0 over **150ms** with the same curve. There's no exit fade: the old
  text disappears instantly, which avoids two captions overlapping.
- On open, nothing changes: the first `updateUI()` call doesn't animate.

Opacity-only, so it is kept under reduced motion as well (reduced motion means "no movement", not
"no feedback").

```js
/* target — src/components/gallery.js */
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'; // same curve as --ease-out in tokens.css

/* …inside openGallery… */

  function updateUI({ animate = false } = {}) {
    const photo = photos[index];
    caption.textContent = photo.caption;
    counter.textContent = `Photo ${index + 1} of ${photos.length}`;
    if (animate) {
      // The surroundings follow the photo instead of swapping on one frame:
      // the old glow fades out over the new one, the new caption fades in
      const previous = ambient.cloneNode();
      ambient.before(previous);
      const fadeOut = previous.animate([{ opacity: 0 }], { duration: 250, easing: EASE_OUT });
      fadeOut.onfinish = fadeOut.oncancel = () => previous.remove();
      ambient.animate([{ opacity: 0, offset: 0 }], { duration: 250, easing: EASE_OUT });
      caption.animate([{ opacity: 0, offset: 0 }], { duration: 150, easing: EASE_OUT });
    }
    ambient.style.backgroundImage = `url("${photo.src}")`;
    /* …rest unchanged… */
  }
```

```js
/* target — in go(), replace the bare updateUI(); */
    updateUI({ animate: changed });
```

Single-keyframe `animate()` calls rely on implicit keyframes:

- `[{ opacity: 0 }]` animates **from** the current value **to** 0;
- `[{ opacity: 0, offset: 0 }]` animates **from** 0 **to** the current value.

So the CSS opacity `0.5` is never duplicated in JS.

## Repo conventions to follow

- WAAPI fades are already used in this exact function for reduced motion. Exemplar, `src/components/gallery.js:212`:
  `images[index].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });`.
- Module-level constants in this file sit right after `const clamp01 = …` near the top, after the
  `let active = null;` / `isGalleryOpen` / `closeGallery` block. Put `EASE_OUT` directly after `clamp01`.
- The CSS twin of this curve is the `--ease-out` token in `src/styles/tokens.css` (added by plan 001).
  Keep the comment pointing at it.

## Steps

1. **`src/components/gallery.js`**: directly after the line
   `const clamp01 = (v) => Math.min(1, Math.max(0, v));`, add:

   ```js
   const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'; // same curve as --ease-out in tokens.css
   ```
2. **`src/components/gallery.js`**: change the signature `function updateUI() {` to
   `function updateUI({ animate = false } = {}) {`.
3. Still in `updateUI`, insert the `if (animate) { … }` block from *Target* between the `counter.textContent = …`
   line and the `ambient.style.backgroundImage = …` line. The order matters: the clone must be taken
   **before** the background image changes.
4. In `go()`, replace `updateUI();` with `updateUI({ animate: changed });`.
5. Leave the `updateUI();` call in the open sequence, after `trackX.set(-index * width);`, unchanged.

## Boundaries

- Do NOT change the photo track, the springs, gestures, open/close or thumbnails.
- Do NOT animate the counter text (it is `aria-live` and tiny).
- Do NOT add CSS for this. The ambient layer's opacity and blur stay defined only in `src/styles/gallery.css`.
- If the quoted code doesn't match what you find, STOP and report.

## Verification

- **Mechanical**: `npm run build`. Expected: the build completes with no errors.
- **Feel check**: run `npm run dev`, open Faina's gallery (the first card's **Gallery** button; she has 4
  real photos with different colours).
  - Press →. The coloured glow behind the photo blends into the new photo's colours over about ¼ s, with no
    flash. The caption fades in.
  - Swipe/drag between photos. Same blend, nothing flashes.
  - Hold → (or click next rapidly) to the last photo. No stacked or stuck layers remain: in Elements,
    `.gallery__ambient` count returns to 1 shortly after you stop.
  - Press → on the last photo (it can't advance). Nothing fades, because `changed` is false.
  - Opening the gallery shows the glow and caption immediately, with no fade on open.
  - In DevTools → Rendering, emulate `prefers-reduced-motion: reduce`. Changing photos still crossfades the
    glow and caption (opacity only).
- **Done when**: glow and caption no longer swap on a single frame when the photo changes, no extra ambient
  layers linger, and the build passes.
