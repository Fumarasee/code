import { prefersReducedMotion } from '../lib/utils.js';

/**
 * Northern-lights background.
 *
 * - Aurora: a WebGL fragment shader (simplex-noise curtain + 3-stop colour
 *   ramp, adapted from ReactBits' <Aurora>) drawn on one fullscreen triangle.
 *   It is soft by nature, so it renders at half resolution and ~30 fps — the
 *   difference is invisible, but it halves the work for every glass panel
 *   that blurs it. No dependencies: plain WebGL 1, so it runs everywhere.
 * - Stars: twinkling points + an occasional shooting star on a 2D canvas.
 * - Both share one loop, pause while the tab is hidden, and freeze into a
 *   single still frame for people who prefer reduced motion.
 * - Gentle mouse parallax (compositor-only `translate`).
 * Without WebGL the page falls back to a static CSS glow.
 */

const VERT = /* glsl */ `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float uTime;
uniform float uAmplitude;
uniform float uBlend;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec2 uResolution;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Colour ramp with stops at 0, 0.5 and 1 (no dynamic array indexing)
  vec3 ramp = uv.x < 0.5
    ? mix(uColor0, uColor1, uv.x * 2.0)
    : mix(uColor1, uColor2, uv.x * 2.0 - 1.0);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = uv.y * 2.0 - height + 0.2;
  float intensity = 0.6 * height;

  float alpha = smoothstep(0.2 - uBlend * 0.5, 0.2 + uBlend * 0.5, intensity);
  // Premultiplied output, composited over the page's night-sky gradient
  gl_FragColor = vec4(intensity * ramp * alpha, alpha);
}
`;

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Minimal WebGL renderer for the aurora shader. Returns null if unavailable. */
function createAuroraGL(canvas, { colorStops, amplitude, blend }) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false, // a soft fullscreen gradient gains nothing from MSAA
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Aurora shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // One triangle that covers the whole viewport
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uTime = u('uTime');
  const uResolution = u('uResolution');
  gl.uniform1f(u('uAmplitude'), amplitude);
  gl.uniform1f(u('uBlend'), blend);
  const [c0, c1, c2] = colorStops.map(hexToRgb);
  gl.uniform3fv(u('uColor0'), c0);
  gl.uniform3fv(u('uColor1'), c1);
  gl.uniform3fv(u('uColor2'), c2);
  gl.clearColor(0, 0, 0, 0);

  return {
    resize(width, height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
    },
    render(time) {
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

const RENDER_SCALE = 0.5; // CSS px → buffer px; the aurora is soft, so half-res is invisible
const MAX_BUFFER_WIDTH = 1280;
const FRAME_MS = 1000 / 30; // slow, soft motion reads perfectly at 30 fps
const STILL_TIME = 14; // the frame shown to people who prefer reduced motion

/**
 * @param {{colorStops?: string[], amplitude?: number, blend?: number, speed?: number}} options
 */
export function initAurora({
  colorStops = ['#7cff67', '#00e8f5', '#00fc97'],
  amplitude = 1.0,
  blend = 0.87,
  speed = 0.4,
} = {}) {
  const root = document.querySelector('.aurora');
  if (!root) return;
  const starsCanvas = root.querySelector('.aurora__stars');
  const glCanvas = root.querySelector('.aurora__gl');
  const ctx = starsCanvas.getContext('2d');
  const reduced = prefersReducedMotion();
  const options = { colorStops, amplitude, blend };

  let aurora = glCanvas ? createAuroraGL(glCanvas, options) : null;
  root.classList.toggle('aurora--static', !aurora);

  let w = 0;
  let h = 0;
  let stars = [];
  let shooting = null;
  let nextShooting = 4;
  let last = -Infinity;

  function resizeAurora() {
    if (!aurora) return;
    const bw = Math.min(Math.round(w * RENDER_SCALE), MAX_BUFFER_WIDTH);
    aurora.resize(bw, Math.max(1, Math.round((bw * h) / w)));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    starsCanvas.width = Math.round(w * dpr);
    starsCanvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 5200);
    stars = Array.from({ length: count }, () => {
      const tint = Math.random();
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.9,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random() * 0.6 + 0.25,
        speed: Math.random() * 1.8 + 0.4,
        phase: Math.random() * Math.PI * 2,
        color: tint < 0.1 ? '191,239,255' : tint < 0.18 ? '224,200,255' : '255,255,255',
      };
    });
    resizeAurora();
    draw(reduced ? STILL_TIME : performance.now() / 1000);
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const alpha = reduced ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(${s.color},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!shooting) return;
    const p = (t - shooting.start) / shooting.duration;
    if (p >= 1) {
      shooting = null;
      return;
    }
    const x = shooting.x + shooting.dx * p;
    const y = shooting.y + shooting.dy * p;
    const len = Math.hypot(shooting.dx, shooting.dy);
    const tx = x - (shooting.dx / len) * 110;
    const ty = y - (shooting.dy / len) * 110;
    const grad = ctx.createLinearGradient(x, y, tx, ty);
    const fade = Math.sin(p * Math.PI);
    grad.addColorStop(0, `rgba(220,255,245,${0.9 * fade})`);
    grad.addColorStop(1, 'rgba(120,255,210,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  /** Stars and aurora are drawn in the same frame: one compositor update. */
  function draw(t) {
    drawStars(t);
    aurora?.render(reduced ? STILL_TIME * speed : t * speed);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < FRAME_MS - 1) return;
    last = now;
    const t = now / 1000;
    if (!shooting && t > nextShooting) {
      shooting = {
        start: t,
        duration: 1.1,
        x: Math.random() * w * 0.7 + w * 0.1,
        y: Math.random() * h * 0.3,
        dx: 260 + Math.random() * 200,
        dy: 90 + Math.random() * 80,
      };
      nextShooting = t + 7 + Math.random() * 9;
    }
    draw(t);
  }

  // Resize at most once per frame
  let resizeQueued = false;
  window.addEventListener(
    'resize',
    () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        resize();
      });
    },
    { passive: true },
  );

  // Survive a lost GPU context (driver reset, too many contexts…)
  glCanvas?.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    aurora = null;
    root.classList.add('aurora--static');
  });
  glCanvas?.addEventListener('webglcontextrestored', () => {
    aurora = createAuroraGL(glCanvas, options);
    root.classList.toggle('aurora--static', !aurora);
    resizeAurora();
    draw(reduced ? STILL_TIME : performance.now() / 1000);
  });

  resize();
  if (reduced) return; // one still frame, no loop, no parallax

  requestAnimationFrame(frame);

  // Gentle mouse parallax (CSS `translate` on the layers — compositor only)
  let px = 0;
  let py = 0;
  let queued = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        root.style.setProperty('--px', px.toFixed(3));
        root.style.setProperty('--py', py.toFixed(3));
        queued = false;
      });
    },
    { passive: true },
  );
}
