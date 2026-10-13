# Animation plans

These plans come from an `improve-animations` audit of the site's motion. The audit follows Emil Kowalski's
animation philosophy, applied on top of the existing spring system.

The audit was run at commit `d494e09`. Each plan is self-contained: exact files, current code, target values,
steps, boundaries and a feel check. Any agent can execute a plan without this conversation.

**Overall verdict:** the motion system is already in good shape:

- springs and tokens throughout;
- interruptible gestures and instant press feedback;
- no `transition: all`, no `scale(0)`, no animated layout properties;
- reduced motion handled in CSS.

The plans are small corrections and three additive touches.

## Plans

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Search popover: interruptible transitions, ease-out exit](001-search-popover-transitions.md) | HIGH | Easing; Interruptibility | DONE |
| 002 | [Programmatic scrolls respect reduced motion; `/` jumps](002-smooth-scroll-reduced-motion.md) | MEDIUM | Accessibility; Frequency | DONE |
| 003 | [Route crossfade: ease-out + 2px blur mask](003-route-crossfade.md) | LOW | Easing; Cohesion | DONE |
| 004 | [Gate hover motion to real hover devices](004-gate-hover-motion.md) | LOW | Accessibility | DONE |
| 005 | [Temperament bars: clip reveal instead of scaleX](005-trait-bar-fill.md) | LOW | Physicality | DONE |
| 006 | [Fold stray motion values into tokens](006-motion-token-cleanup.md) | LOW | Cohesion & tokens | DONE |
| 007 | [Filtering: leaving cards fade out in place](007-filter-leaving-cards.md) | LOW | Missed opportunity | DONE |
| 008 | [Empty state eases in](008-empty-state-entrance.md) | LOW | Missed opportunity | DONE |
| 009 | [Gallery: crossfade ambient glow, fade in caption](009-gallery-caption-ambient-crossfade.md) | LOW | Missed opportunity | DONE |

## Recommended execution order

1. **001**: it adds the `--ease-out` token that 003, 006 and 008 use.
2. **002**: the smallest change with the clearest accessibility win.
3. **004**, then **006**, **003** and **005**. These are CSS-only and independent of each other.
4. **007**, **008** and **009**. These are additive. Do 007 before 008: both touch the empty-search flow,
   so check them together.

## Dependencies

- 003, 006 and 008 need `--ease-out` in `src/styles/tokens.css`. Each plan says how to add it if 001
  hasn't been run.
- 004, 007 and 008 all edit `src/styles/components.css`, in different rules. Run them one after another,
  not in parallel.
- 001 and 006 both edit `src/styles/home.css`, in different rules (`.search__suggestions` vs
  `.search__option`).

## Deliberately not planned

- **Spring durations (≈0.52s) above the 300ms UI budget.** The curve is front-loaded: it is 95% done by
  about 0.26s. Springs are also a documented project decision ("Springs, not durations" in the root
  README).
- **The gallery grows from 0.6 scale.** That is an intentional morph out of the button that opened it, not
  a `scale(0)`.
- **Scaling the whole page behind the open gallery.** It could be costly with many glass panels, but that
  can't be proven from code. Profile it on real hardware before planning anything.
