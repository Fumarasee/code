import { prefersReducedMotion } from '../lib/utils.js';

/**
 * Animated background: twinkling star field + occasional shooting stars on a
 * canvas, plus gentle mouse parallax for the CSS aurora bands.
 */
export function initAurora() {
  const root = document.querySelector('.aurora');
  const canvas = root?.querySelector('.aurora__stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();

  let w = 0;
  let h = 0;
  let stars = [];
  let shooting = null;
  let nextShooting = 4;
  let last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
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
    draw(last / 1000);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const alpha = reduced ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(${s.color},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (shooting) {
      const p = (t - shooting.start) / shooting.duration;
      if (p >= 1) {
        shooting = null;
      } else {
        const x = shooting.x + shooting.dx * p;
        const y = shooting.y + shooting.dy * p;
        const tail = 110;
        const len = Math.hypot(shooting.dx, shooting.dy);
        const tx = x - (shooting.dx / len) * tail;
        const ty = y - (shooting.dy / len) * tail;
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
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return; // ~30 fps is plenty for twinkles
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

  window.addEventListener('resize', resize, { passive: true });
  resize();
  if (!reduced) requestAnimationFrame(frame);

  // Mouse parallax for the aurora bands
  if (!reduced) {
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
}
