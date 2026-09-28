/**
 * Generated husky portraits.
 *
 * Until real photos are added, every photo slot is drawn as an SVG illustration
 * using the dog's own coat and eye colors, so each dog is recognisable.
 * Real photos (a `src` on the photo entry) always win.
 */
import { hashString, mulberry32 } from './utils.js';
import { mix, shade, luminance } from './color.js';

const W = 400;
const H = 500;

const SCENES = {
  aurora: { sky: ['#030713', '#0a1a3c', '#15405a'], ground: ['#dce8f4', '#8fa6c2'], stars: 80, aurora: true },
  forest: { sky: ['#040a16', '#0c2233', '#1d4150'], ground: ['#d3e0ec', '#7f97ad'], stars: 35, trees: true },
  moon: { sky: ['#06051a', '#191241', '#35265f'], ground: ['#cfcbe9', '#7a74a8'], stars: 100, moon: true },
  snow: { sky: ['#0b1626', '#1e3448', '#3a5870'], ground: ['#eef4fa', '#a6bacd'], stars: 0, snowfall: true },
  twilight: { sky: ['#0a0a24', '#3b1f55', '#c0648c'], ground: ['#e6d8ec', '#9a86ad'], stars: 45, hills: true },
  dawn: { sky: ['#13264a', '#3f6f96', '#f2b48a'], ground: ['#f3f6fb', '#b3c2d6'], stars: 0, hills: true, sun: true },
};

const f = (n) => Math.round(n * 10) / 10;

function stars(rng, count) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = rng() * 290;
    const r = 0.4 + rng() * 1.2;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff" opacity="${f(0.25 + rng() * 0.75)}"/>`;
  }
  return out;
}

function auroraRibbons(accent, rng) {
  const y1 = 110 + rng() * 40;
  const y2 = 170 + rng() * 40;
  const ribbon = (y, grad, width) =>
    `<path d="M-40 ${f(y)} C 60 ${f(y - 70)} 150 ${f(y + 50)} 240 ${f(y - 10)} S 380 ${f(y - 80)} 460 ${f(y - 20)}" stroke="url(#${grad})" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
  return `
    <g filter="url(#blurL)" opacity=".9">${ribbon(y1, 'aur1', 54)}${ribbon(y2, 'aur2', 40)}</g>
    <g filter="url(#blurS)" opacity=".55">${ribbon(y1 - 6, 'aur1', 10)}</g>`;
}

function pine(x, baseY, h, color) {
  const w = h * 0.3;
  return `<path d="M${f(x)} ${f(baseY - h)} L${f(x + w * 0.55)} ${f(baseY - h * 0.55)} L${f(x + w * 0.3)} ${f(baseY - h * 0.55)} L${f(x + w * 0.8)} ${f(baseY - h * 0.18)} L${f(x + w * 0.45)} ${f(baseY - h * 0.18)} L${f(x + w)} ${f(baseY)} L${f(x - w)} ${f(baseY)} L${f(x - w * 0.45)} ${f(baseY - h * 0.18)} L${f(x - w * 0.8)} ${f(baseY - h * 0.18)} L${f(x - w * 0.3)} ${f(baseY - h * 0.55)} L${f(x - w * 0.55)} ${f(baseY - h * 0.55)} Z" fill="${color}"/>`;
}

function forest(rng) {
  let far = '';
  let near = '';
  for (let x = -10; x < W + 20; x += 26 + rng() * 18) far += pine(x, 404, 70 + rng() * 60, '#16344a');
  for (let x = -20; x < W + 30; x += 44 + rng() * 30) near += pine(x, 412, 110 + rng() * 90, '#0a1a26');
  return `<g opacity=".75">${far}</g><g>${near}</g>`;
}

function hills(sky) {
  return `
    <path d="M0 360 C 90 320 170 350 240 330 C 310 312 360 334 400 324 L400 420 L0 420 Z" fill="${mix(sky[1], '#000000', 0.35)}" opacity=".85"/>
    <path d="M0 388 C 110 360 190 384 280 366 C 340 356 380 372 400 368 L400 430 L0 430 Z" fill="${mix(sky[1], '#000000', 0.55)}"/>`;
}

function snowfall(rng, count, opacityScale = 1) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<circle cx="${f(rng() * W)}" cy="${f(rng() * H)}" r="${f(0.8 + rng() * 2.2)}" fill="#fff" opacity="${f((0.35 + rng() * 0.55) * opacityScale)}"/>`;
  }
  return out;
}

function eye({ cx, cy, rot, color, parti, mood, look, id }) {
  const tr = `transform="rotate(${rot} ${cx} ${cy})"`;
  if (mood === 'sleepy') {
    return `<path d="M${cx - 17} ${cy + 1} Q${cx} ${cy + 10} ${cx + 17} ${cy + 1}" stroke="#15161c" stroke-width="3.4" fill="none" stroke-linecap="round" ${tr}/>`;
  }
  const lx = f(cx + look.x);
  const ly = f(cy + look.y);
  let wedge = '';
  if (parti) {
    const r = 10.5;
    const a1 = (-40 * Math.PI) / 180;
    const a2 = (75 * Math.PI) / 180;
    wedge = `<path d="M${lx} ${ly} L${f(lx + r * Math.cos(a1))} ${f(ly + r * Math.sin(a1))} A${r} ${r} 0 0 1 ${f(lx + r * Math.cos(a2))} ${f(ly + r * Math.sin(a2))} Z" fill="${parti}" opacity=".95"/>`;
  }
  return `
    <radialGradient id="${id}g" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="${shade(color, 0.45)}"/>
      <stop offset=".55" stop-color="${color}"/>
      <stop offset="1" stop-color="${shade(color, -0.35)}"/>
    </radialGradient>
    <clipPath id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="19" ry="11.5" ${tr}/></clipPath>
    <ellipse cx="${cx}" cy="${cy}" rx="22.5" ry="14.5" fill="#14151b" ${tr}/>
    <g clip-path="url(#${id})">
      <ellipse cx="${cx}" cy="${cy}" rx="19" ry="11.5" fill="${shade(color, -0.6)}" ${tr}/>
      <circle cx="${lx}" cy="${ly}" r="10.5" fill="url(#${id}g)"/>
      ${wedge}
      <circle cx="${lx}" cy="${ly}" r="4.6" fill="#07080c"/>
      <circle cx="${f(lx - 3.6)}" cy="${f(ly - 3.8)}" r="2.6" fill="#fff" opacity=".92"/>
      <circle cx="${f(lx + 3.2)}" cy="${f(ly + 3)}" r="1.1" fill="#fff" opacity=".6"/>
    </g>`;
}

function mouth(mood, light) {
  const line = '#2b2a33';
  if (mood === 'happy') {
    return `
      <path d="M200 318 L200 334" stroke="${line}" stroke-width="3" stroke-linecap="round"/>
      <path d="M172 332 Q200 348 228 332 Q222 362 200 364 Q178 362 172 332 Z" fill="#3a1b24"/>
      <path d="M186 346 Q200 343 214 346 Q216 374 200 378 Q184 374 186 346 Z" fill="#ef7f98"/>
      <path d="M200 350 L200 368" stroke="#d45f7a" stroke-width="2" stroke-linecap="round"/>
      <path d="M172 332 Q200 348 228 332" stroke="${line}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  if (mood === 'howl') {
    return `
      <path d="M200 318 L200 327" stroke="${line}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="200" cy="342" rx="10" ry="13" fill="#3a1b24" stroke="${shade(light, -0.25)}" stroke-width="2"/>`;
  }
  return `<path d="M200 318 L200 330 M200 330 Q189 341 176 335 M200 330 Q211 341 224 335" stroke="${line}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function husky(dog, shot, rng, accent) {
  const dark = dog.coat.primary;
  const light = dog.coat.secondary;
  const lightCoat = luminance(dark) > 0.45;
  const outline = lightCoat ? shade(dark, -0.35) : shade(dark, -0.5);
  const outlineOpacity = lightCoat ? 0.9 : 0.5;
  const earInner = mix(light, '#e39aa5', 0.4);
  const mood = shot.mood || 'calm';
  const tilt = (shot.tilt || 0) + (mood === 'howl' ? -6 : 0);
  const zoom = shot.zoom || 1;
  const lift = mood === 'howl' ? -8 : 0;
  const look = { x: (rng() - 0.5) * 5, y: (rng() - 0.5) * 3 };
  const rim = shot.scene === 'aurora' || shot.scene === 'moon';

  const eyes = [
    eye({ cx: 160, cy: 256, rot: 14, color: dog.eyes.left, parti: dog.eyes.leftParti, mood, look, id: 'eL' }),
    eye({ cx: 240, cy: 256, rot: -14, color: dog.eyes.right, parti: dog.eyes.rightParti, mood, look, id: 'eR' }),
  ].join('');

  const headPath =
    'M200 146 C 284 146 322 206 320 272 C 318 336 278 384 200 394 C 122 384 82 336 80 272 C 78 206 116 146 200 146 Z';
  const tuftL = 'M94 292 L70 308 L92 312 L74 330 L100 328 L92 346 L118 336 Z';
  const tuftR = 'M306 292 L330 308 L308 312 L326 330 L300 328 L308 346 L282 336 Z';

  return `
  <defs>
    <radialGradient id="furHead" cx="50%" cy="30%" r="70%">
      <stop offset="0" stop-color="${shade(dark, lightCoat ? 0.3 : 0.16)}"/>
      <stop offset="1" stop-color="${dark}"/>
    </radialGradient>
    <linearGradient id="furBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(dark, lightCoat ? 0.2 : 0.1)}"/>
      <stop offset="1" stop-color="${shade(dark, -0.2)}"/>
    </linearGradient>
  </defs>
  <g transform="translate(200 500) scale(${zoom}) translate(-200 -500)">
    <path d="M18 520 C 34 420 108 370 200 368 C 292 370 366 420 382 520 Z" fill="url(#furBody)" stroke="${outline}" stroke-opacity="${outlineOpacity}" stroke-width="2"/>
    <path d="M104 520 C 116 452 146 410 172 402 L180 416 L188 400 L200 414 L212 400 L220 416 L228 402 C 254 410 284 452 296 520 Z" fill="${light}"/>
    <g transform="translate(0 ${lift}) rotate(${tilt} 200 300)">
      <path d="M104 214 L130 86 Q138 76 147 85 L196 168 Z" fill="${dark}" stroke="${outline}" stroke-opacity="${outlineOpacity}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M122 194 L137 112 L176 168 Z" fill="${earInner}"/>
      <path d="M296 214 L270 86 Q262 76 253 85 L204 168 Z" fill="${dark}" stroke="${outline}" stroke-opacity="${outlineOpacity}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M278 194 L263 112 L224 168 Z" fill="${earInner}"/>
      <path d="${headPath}" fill="url(#furHead)" stroke="${outline}" stroke-opacity="${outlineOpacity}" stroke-width="2"/>
      ${rim ? `<path d="${headPath}" fill="none" stroke="${accent[0]}" stroke-opacity=".45" stroke-width="3" filter="url(#blurS)"/>` : ''}
      <path d="M200 226 C 190 226 180 204 162 200 C 128 194 100 226 98 266 C 96 314 128 364 200 392 C 272 364 304 314 302 266 C 300 226 272 194 238 200 C 220 204 210 226 200 226 Z" fill="${light}"/>
      <path d="${tuftL}" fill="${light}"/>
      <path d="${tuftR}" fill="${light}"/>
      <ellipse cx="158" cy="186" rx="13" ry="7" fill="${light}" transform="rotate(-12 158 186)"/>
      <ellipse cx="242" cy="186" rx="13" ry="7" fill="${light}" transform="rotate(12 242 186)"/>
      <ellipse cx="200" cy="340" rx="44" ry="26" fill="${shade(light, -0.07)}" opacity=".6"/>
      ${eyes}
      <path d="M182 298 Q200 286 218 298 Q216 314 200 318 Q184 314 182 298 Z" fill="#111217"/>
      <ellipse cx="194" cy="297" rx="5.5" ry="2.6" fill="#fff" opacity=".35"/>
      ${mouth(mood, light)}
      <g fill="${shade(light, -0.32)}">
        <circle cx="178" cy="318" r="1.7"/><circle cx="171" cy="326" r="1.7"/><circle cx="181" cy="328" r="1.5"/>
        <circle cx="222" cy="318" r="1.7"/><circle cx="229" cy="326" r="1.7"/><circle cx="219" cy="328" r="1.5"/>
      </g>
    </g>
  </g>`;
}

function buildSvg(dog, shot, index) {
  const scene = SCENES[shot.scene] || SCENES.aurora;
  const rng = mulberry32(hashString(`${dog.id}:${index}:${shot.scene}`));
  const accent = dog.accent || ['#3cf2a4', '#a86bff'];
  const sky = scene.sky;
  const gy = 405;

  const background = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    scene.stars ? stars(rng, scene.stars) : '',
    scene.sun ? `<circle cx="300" cy="360" r="160" fill="url(#sunGlow)"/>` : '',
    scene.moon
      ? `<circle cx="306" cy="104" r="110" fill="url(#moonGlow)"/><circle cx="306" cy="104" r="40" fill="#f5f2ff"/><circle cx="292" cy="96" r="7" fill="#dcd6f2"/><circle cx="318" cy="118" r="5" fill="#e2dcf5"/><circle cx="314" cy="88" r="3.5" fill="#e2dcf5"/>`
      : '',
    scene.aurora ? auroraRibbons(accent, rng) : '',
    !scene.aurora && (scene.moon || scene.stars > 40) ? `<g opacity=".35">${auroraRibbons(accent, rng)}</g>` : '',
    scene.hills ? hills(sky) : '',
    scene.trees ? forest(rng) : '',
    `<path d="M0 ${gy} C 120 ${gy - 18} 280 ${gy + 12} 400 ${gy - 6} L400 500 L0 500 Z" fill="url(#ground)"/>`,
    scene.snowfall ? snowfall(rng, 60, 0.8) : '',
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/><stop offset=".62" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${scene.ground[0]}"/><stop offset="1" stop-color="${scene.ground[1]}"/>
    </linearGradient>
    <linearGradient id="aur1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent[0]}" stop-opacity="0"/>
      <stop offset=".3" stop-color="${accent[0]}" stop-opacity=".95"/>
      <stop offset=".7" stop-color="${mix(accent[0], accent[1], 0.5)}" stop-opacity=".8"/>
      <stop offset="1" stop-color="${accent[1]}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="aur2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent[1]}" stop-opacity="0"/>
      <stop offset=".45" stop-color="${accent[1]}" stop-opacity=".75"/>
      <stop offset="1" stop-color="${accent[0]}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="moonGlow"><stop offset="0" stop-color="#e9e4ff" stop-opacity=".55"/><stop offset="1" stop-color="#e9e4ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#ffd9a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffb38a" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="45%" r="75%">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </radialGradient>
    <filter id="blurL" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="blurS" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  ${background}
  ${husky(dog, shot, rng, accent)}
  ${scene.snowfall ? snowfall(rng, 18, 1) : ''}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

const cache = new Map();

function resolveSrc(src) {
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src;
  return `${import.meta.env.BASE_URL}${src}`;
}

/** Returns `{ src, caption, generated }` for the dog's photo at `index`. */
export function dogPhoto(dog, index = 0) {
  const shot = dog.photos[index] || dog.photos[0] || { scene: 'aurora' };
  if (shot.src) return { src: resolveSrc(shot.src), caption: shot.caption || '', generated: false };
  const key = `${dog.id}:${index}`;
  if (!cache.has(key)) {
    const svg = buildSvg(dog, shot, index);
    cache.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }
  return { src: cache.get(key), caption: shot.caption || '', generated: true };
}

export function dogPhotos(dog) {
  return dog.photos.map((_, i) => dogPhoto(dog, i));
}
