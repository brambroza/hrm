/**
 * @file Fades sections in as they scroll into view.
 *
 * Content is visible by default. Only once this code is running does it hide
 * what is still below the fold, and it shows each element the moment the
 * browser reports it on screen. If the script never runs, or the browser has
 * no IntersectionObserver, nothing is ever hidden.
 *
 * It replaces scroll triggers that measured positions once at load: when the
 * layout moved afterwards, some triggers never fired and whole sections stayed
 * invisible.
 */

/** Class put on the root once hiding is safe. CSS keys off it. */
export const READY_CLASS = 'reveal-ready';
/** Class put on an element once it has been seen. */
export const VISIBLE_CLASS = 'is-visible';
/** Delay between the children of a staggered group, in milliseconds. */
export const STAGGER_MS = 80;
/** Longest delay any child gets, so a long list does not keep the reader waiting. */
export const MAX_STAGGER_MS = 480;

/**
 * Start revealing the elements under a root.
 *
 * @param {Element} root - Container of the page.
 * @param {object} [options]
 * @param {boolean} [options.reducedMotion] - True when the visitor asked for less motion.
 * @param {typeof IntersectionObserver} [options.Observer] - Observer class; the browser's by default.
 * @returns {() => void} Stops observing and makes everything visible again.
 */
export const startReveal = (root, { reducedMotion = false, Observer = globalThis.IntersectionObserver } = {}) => {
  if (!root || reducedMotion || typeof Observer !== 'function') return () => {};

  const targets = [];
  root.querySelectorAll('.reveal').forEach((el) => targets.push(el));
  root.querySelectorAll('.stagger-group').forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.transitionDelay = `${Math.min(index * STAGGER_MS, MAX_STAGGER_MS)}ms`;
      targets.push(child);
    });
  });

  const observer = new Observer(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(VISIBLE_CLASS);
        observer.unobserve(entry.target);
      });
    },
    // A little before the element reaches the viewport, so it is already there when the reader arrives.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );

  targets.forEach((el) => observer.observe(el));
  root.classList.add(READY_CLASS);

  return () => {
    observer.disconnect();
    root.classList.remove(READY_CLASS);
    targets.forEach((el) => {
      el.classList.remove(VISIBLE_CLASS);
      el.style.transitionDelay = '';
    });
  };
};

/** Styles that go with startReveal. Hidden only while the root is ready and the element unseen. */
export const REVEAL_CSS = `
  .${READY_CLASS} .reveal,
  .${READY_CLASS} .stagger-group > * {
    transition: opacity .6s ease, transform .6s ease, border-color .3s ease, background-color .3s ease, box-shadow .3s ease;
  }
  .${READY_CLASS} .reveal:not(.${VISIBLE_CLASS}),
  .${READY_CLASS} .stagger-group > *:not(.${VISIBLE_CLASS}) {
    opacity: 0;
    transform: translateY(24px);
  }
  @media (prefers-reduced-motion: reduce) {
    .${READY_CLASS} .reveal,
    .${READY_CLASS} .stagger-group > * { opacity: 1 !important; transform: none !important; transition: none !important; }
  }
`;
