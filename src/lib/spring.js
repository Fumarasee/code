/**
 * Apple-style motion primitives.
 *
 * Springs are parameterised the way UIKit/SwiftUI do it — `damping` ratio
 * (1 = critically damped, no overshoot; < 1 bounces) and `response` (seconds,
 * how quickly it gets there; not a duration). They are interruptible by
 * design: retargeting keeps the current on-screen value *and* velocity.
 */

/** Physical constants for a unit-mass spring from damping ratio + response. */
function coefficients(damping, response) {
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  return { stiffness, friction };
}

export class Spring {
  /**
   * @param {number} value initial value
   * @param {{damping?: number, response?: number, precision?: number, onUpdate?: (v:number)=>void, onRest?: ()=>void}} opts
   */
  constructor(value = 0, { damping = 1, response = 0.4, precision = 0.01, onUpdate, onRest } = {}) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.damping = damping;
    this.response = response;
    this.precision = precision;
    this.onUpdate = onUpdate;
    this.onRest = onRest;
    this.frame = 0;
    this.last = 0;
    this.tick = this.tick.bind(this);
  }

  get isAnimating() {
    return this.frame !== 0;
  }

  /** Jump to a value with no animation (used for 1:1 gesture tracking). */
  set(value) {
    this.stop();
    this.value = this.target = value;
    this.velocity = 0;
    this.onUpdate?.(value);
  }

  /** Animate to `target`, starting from the current value and velocity. */
  to(target, { damping = this.damping, response = this.response, velocity } = {}) {
    this.target = target;
    this.damping = damping;
    this.response = response;
    if (velocity !== undefined) this.velocity = velocity; // gesture velocity handoff (units/s)
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
    return this;
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  tick(now) {
    // Follow wall-clock time even on slow frames (sub-steps keep it stable);
    // only cap huge gaps such as a backgrounded tab.
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const { stiffness, friction } = coefficients(this.damping, this.response);
    // Semi-implicit Euler in small fixed sub-steps: stable at any frame rate
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = -stiffness * (this.value - this.target) - friction * this.velocity;
      this.velocity += force * h;
      this.value += this.velocity * h;
    }
    const settled =
      Math.abs(this.value - this.target) < this.precision && Math.abs(this.velocity) < this.precision * 10;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
      this.frame = 0;
      this.onUpdate?.(this.value);
      this.onRest?.();
      return;
    }
    this.onUpdate?.(this.value);
    this.frame = requestAnimationFrame(this.tick);
  }
}

/**
 * Where a flick will come to rest, using Apple's exponential-decay projection
 * (from the "Designing Fluid Interfaces" sample code). 0.998 ≈ normal scroll.
 */
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Soft boundary: the further past the edge, the less the element follows. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Keeps a short pointer history so velocity is available at release. */
export class VelocityTracker {
  constructor() {
    this.samples = [];
  }
  reset() {
    this.samples = [];
  }
  /** Record a pointer sample — pass the event's own timeStamp for accuracy. */
  add(x, y, t = performance.now()) {
    this.samples.push({ x, y, t });
    while (this.samples.length > 20) this.samples.shift();
  }
  /** Record a pointer event, including the browser's coalesced in-between samples. */
  addEvent(e) {
    const events = e.getCoalescedEvents?.() ?? [];
    if (events.length) events.forEach((c) => this.add(c.clientX, c.clientY, c.timeStamp));
    else this.add(e.clientX, e.clientY, e.timeStamp);
  }
  /**
   * px/s over the ~100 ms before the most recent sample. Because the release
   * itself is recorded, pausing before letting go correctly reads as ~0.
   */
  velocity() {
    const s = this.samples;
    if (s.length < 2) return { x: 0, y: 0 };
    const b = s[s.length - 1];
    let a = s[s.length - 2];
    for (let i = s.length - 2; i >= 0 && b.t - s[i].t <= 100; i--) a = s[i];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) return { x: 0, y: 0 };
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  }
}

/**
 * The same spring as a CSS `linear()` easing + duration, for state changes
 * that stay in CSS (hover, focus). Critically damped by default.
 */
export function springEasing({ damping = 1, response = 0.35 } = {}) {
  const w = (2 * Math.PI) / response;
  const position = (t) => {
    if (damping >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
  };
  // Settle time: last moment the curve is still more than 0.1% away from 1
  let duration = response;
  for (let t = 0; t < 5; t += 0.005) if (Math.abs(1 - position(t)) > 0.001) duration = t;
  duration = Math.ceil(duration * 100) / 100;
  const points = [];
  const N = 40;
  for (let i = 0; i <= N; i++) points.push(+position((duration * i) / N).toFixed(4));
  points[N] = 1;
  return { easing: `linear(${points.join(', ')})`, duration };
}

export const supportsLinearEasing = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)');

/** A tiny haptic tick on devices that support it (Android). Reserve for commits/snaps. */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
