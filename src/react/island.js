/**
 * React islands: mount a React component anywhere in the (vanilla JS) site.
 *
 *   import { mountIsland } from '../react/island.js';
 *
 *   const island = mountIsland(element, () => import('../react/components/MyThing.jsx'), { some: 'prop' });
 *   island.update({ some: 'other prop' }); // re-render with new props
 *   island.unmount();                       // e.g. in a page's cleanup function
 *
 * React itself and the component are loaded on demand (code-split), so pages
 * that don't use an island don't download React at all.
 */
export function mountIsland(target, loadComponent, props = {}) {
  let root = null;
  let disposed = false;
  let latestProps = props;
  let render = null;

  const ready = Promise.all([import('react'), import('react-dom/client'), loadComponent()]).then(
    ([React, { createRoot }, mod]) => {
      if (disposed) return;
      const Component = mod.default ?? mod;
      root = createRoot(target);
      render = (p) => root.render(React.createElement(React.StrictMode, null, React.createElement(Component, p)));
      render(latestProps);
    },
  );

  return {
    /** Resolves once the component has rendered for the first time. */
    ready,
    update(nextProps) {
      latestProps = { ...latestProps, ...nextProps };
      render?.(latestProps);
    },
    unmount() {
      disposed = true;
      root?.unmount();
      root = null;
    },
  };
}
