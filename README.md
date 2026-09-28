# HuskyHub — web

An interactive desktop website for the **HuskyHub** pack: dog cards, rich dog profiles with lore and specs, a
floating photo gallery, search, and a three.js 3D viewer. It uses a glassmorphism style on a dark northern-lights
background.

## Run it

You'll need **Node.js 18.18 or newer**; the current LTS from [nodejs.org](https://nodejs.org) is best. Check your
version with `node --version`. On an older Node the scripts stop and tell you to upgrade.

```bash
npm install
npm run dev       # dev server with hot reload (opens the browser)
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

The build is fully static, with relative paths and hash routing. You can drop `dist/` on any static host
(GitHub Pages, Netlify, a folder on a server, …).

## What's inside

| Page / feature  | What it does |
| --------------- | ------------ |
| **Home**        | Hero with a search bar (live suggestions, ↑/↓/Enter, `/` to focus from anywhere), filter chips (boys, girls, looking for a home, puppies, seniors), sorting, and the dog-card grid. Filtering and sorting animate the cards into their new places. |
| **Dog card**    | Photo, name, gender, age, weight, coat and eye colors, temper and status. Hovering shows a spotlight and tilt. The **gallery button** opens that dog's photos in a floating overlay. The rest of the card opens the profile. |
| **Profile**     | Hero portrait (it morphs from the card via View Transitions), nicknames, lore, quick facts, tags, **3D viewer**, full specs (breed, birthday, coat, pattern, fur length, eyes, height, weight, tail, ears, temper…), story and timeline, temperament meters, "good with", habits, favourites, skills, health card, fun facts, photo grid, pack mates, and previous/next navigation. |
| **Gallery**     | Overlay over the current page with a blurred ambient backdrop, slide animations, thumbnails, keyboard (← → Home End Esc) and drag/swipe. |
| **3D viewer**   | three.js scene with an aurora curtain shader, falling snow, glowing ground rings and orbiting aurora rim lights. The husky follows the camera and cursor with its head, and has **Wag** and **Howl** actions. The toolbar has auto-rotate, zoom and reset. three.js is lazy-loaded, so only profile pages download it. |

## Adding your own dogs, photos and 3D models

All content lives in [`src/data/dogs.js`](src/data/dogs.js). Each dog is a plain object, so you can edit, add or
remove entries freely.

### Photos

Until real photos exist, every photo slot is drawn as an **illustration generated from the dog's own coat and eye
colors** ([`src/lib/placeholders.js`](src/lib/placeholders.js)). To use real photos:

1. Put the files in `public/photos/<dog-id>/`, e.g. `public/photos/loki/01.jpg`.
2. Add a `src` to the photo entry:

```js
photos: [
  { src: 'photos/loki/01.jpg', caption: 'Portrait under the first aurora of the season', focus: '50% 0%' },
  // entries without `src` keep using the generated illustration
],
```

The first photo is the card cover and profile portrait. Cards and thumbnails crop photos to a square. `focus` is a
CSS `object-position` value that picks which part stays in view: `'50% 0%'` keeps the top, so the ears aren't cut off.
The default is `'50% 40%'`. Resize photos to about 1200px on the long side and strip location data before
committing. Faina's photo in `public/photos/faina/` is an example.

### 3D models

Every profile shows a stylised low-poly husky built from that dog's colors. To show a real model:

1. Put an **`.stl`**, `.glb` or `.gltf` file in `public/models/`, e.g. `public/models/loki.stl`.
2. Set `model: 'models/loki.stl'` on the dog.

The viewer centres the model on the snow, scales it to fit and casts shadows. Other behaviour depends on the format:

- **STL** has no colors or materials. It's smoothed and given a clay finish tinted from the dog's coat. STL files are
  usually Z-up (the 3D-printing convention), so the viewer stands them upright automatically.
- **GLB/GLTF** keeps its own materials and plays its first animation clip. If there are clips whose names contain
  `wag` or `howl`, the toolbar buttons play them.

Fine-tune a model with `modelOptions`:

```js
model: 'models/loki.stl',
modelOptions: { rotationY: 90, up: 'z', color: '#8a8f99', smooth: true },
```

## Design

The interface follows Apple's fluid-interface principles, from the WWDC talk *Designing Fluid Interfaces*, adapted
for the web.

- **Springs, not durations.** Motion uses springs (`src/lib/spring.js`) set by a *damping ratio* and a *response*,
  like UIKit and SwiftUI. UI springs are critically damped (damping 1.0, so no overshoot). A little bounce is used
  only after a flick. CSS state changes share the exact same curve: `main.js` writes it into `--spring` as a CSS
  `linear()` easing.
- **Interruptible gestures.** In the gallery, photos follow the pointer 1:1 once it has moved 10px. You can grab a
  photo mid-animation and it continues from where it is on screen. On release, the pointer's velocity carries into
  the spring, and flicks project forward like scroll momentum. The track rubber-bands at the first and last photo.
  Dragging down dismisses the gallery, and your velocity decides whether it closes. It never locks out input
  while closing.
- **Spatial consistency.** The gallery grows out of the button or photo that opened it and returns into it. The
  search popover grows from the field and closes back into it. The dog's photo morphs between its card and the
  profile portrait.
- **Instant feedback.** Anything you can click responds on pointer-down: a 100ms press using the separate `scale`
  property. There is no tap delay. Things you can't click don't react to hover.
- **Materials.** Thin, regular and thick glass signal hierarchy: bigger surfaces have stronger blur and deeper
  shadows. Glass is never stacked on glass; cells inside a card are a darker inset. Content softly blurs where it
  passes under the floating header, instead of a hard divider line.
- **Type.** The platform's system font (SF Pro on Apple devices, Segoe UI on Windows). Letter-spacing and
  line-height change with size: display text is tightened to `-0.03em`, body text is left at `0`, and small caps
  labels get positive tracking. Spacing is in `rem`, so the layout scales with the user's text size.
- **Background.** The northern lights are a WebGL shader (`src/components/aurora.js`, adapted from ReactBits'
  `<Aurora>`) with no dependencies. It renders at half resolution and 30 fps because the aurora is soft, which also
  halves the redraw work for every glass panel above it. It runs in one loop with the star canvas and pauses in
  background tabs. It falls back to a static glow without WebGL. Colours, blend, amplitude and speed are set in
  `initAurora({...})` in `src/main.js`.
- **Accessibility.**
  - `prefers-reduced-motion`: movement becomes instant and fades are kept, so feedback isn't lost. The aurora
    shows a single still frame.
  - `prefers-reduced-transparency`: surfaces turn solid.
  - `prefers-contrast: more`: borders and text get stronger.

## Brand

| File | Use |
| ---- | --- |
| `public/brand/huskyhub-logo.webp` | Original logo (navy + teal), trimmed. Use it on light backgrounds. |
| `public/brand/huskyhub-logo-dark.webp` | The same logo with the navy "H🐾sky" turned near-white. Used in the site's header and footer. |
| `public/favicon.png`, `public/apple-touch-icon.png` | The logo's paw in white on the logo's teal. |

## Project structure

```
index.html              page shell + aurora background layers
src/main.js             router (hash-based), view transitions, global shortcuts
src/data/dogs.js        the pack — all dog content
src/pages/              home, dog profile, 404
src/components/         header/footer, dog card, gallery overlay, aurora background
src/three/huskyViewer.js  three.js 3D viewer
src/lib/                helpers: generated portraits, icons, colors, utils
src/styles/             tokens, base, aurora, components, home, profile, gallery
```

The site uses a dark theme only for now. All colors are CSS custom properties in
[`src/styles/tokens.css`](src/styles/tokens.css), which leaves room for a light theme later.
