import { describe, expect, it } from 'vitest';
import { MAX_STAGGER_MS, READY_CLASS, REVEAL_CSS, STAGGER_MS, VISIBLE_CLASS, startReveal } from '../revealOnScroll';

/** A stand-in for a DOM element: just enough for the code under test. */
const element = (children = []) => {
  const classes = new Set();
  return {
    children,
    style: { transitionDelay: '' },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
  };
};

/** A root holding some `.reveal` elements and some staggered groups. */
const page = (reveals, groups) => ({
  ...element(),
  querySelectorAll: (selector) => (selector === '.reveal' ? reveals : groups),
});

/** Observer that lets the test decide when something comes into view. */
const fakeObserver = () => {
  const state = { observed: new Set(), disconnected: false, callback: null, options: null };
  class Observer {
    constructor(callback, options) {
      state.callback = callback;
      state.options = options;
    }
    observe(el) { state.observed.add(el); }
    unobserve(el) { state.observed.delete(el); }
    disconnect() { state.disconnected = true; state.observed.clear(); }
  }
  state.show = (el, isIntersecting = true) => state.callback([{ target: el, isIntersecting }]);
  return { Observer, state };
};

describe('startReveal', () => {
  it('hides nothing when the visitor asked for less motion', () => {
    const root = page([element()], []);
    const { Observer, state } = fakeObserver();
    startReveal(root, { reducedMotion: true, Observer });
    expect(root.classList.contains(READY_CLASS)).toBe(false);
    expect(state.callback).toBeNull();
  });

  it('hides nothing when the browser cannot observe', () => {
    const root = page([element()], []);
    startReveal(root, { Observer: undefined });
    expect(root.classList.contains(READY_CLASS)).toBe(false);
  });

  it('does nothing without a root', () => {
    expect(() => startReveal(null, { Observer: fakeObserver().Observer })()).not.toThrow();
  });

  it('observes every target before it lets the styles hide anything', () => {
    const a = element();
    const b = element();
    const kids = [element(), element(), element()];
    const root = page([a, b], [element(kids)]);
    const { Observer, state } = fakeObserver();

    startReveal(root, { Observer });

    expect(state.observed.size).toBe(5);
    [a, b, ...kids].forEach((el) => expect(state.observed.has(el)).toBe(true));
    expect(root.classList.contains(READY_CLASS)).toBe(true);
  });

  it('shows an element when it comes into view, and stops watching it', () => {
    const a = element();
    const root = page([a], []);
    const { Observer, state } = fakeObserver();
    startReveal(root, { Observer });

    state.show(a, false);
    expect(a.classList.contains(VISIBLE_CLASS)).toBe(false);

    state.show(a);
    expect(a.classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(state.observed.has(a)).toBe(false);
  });

  it('staggers the children of a group, up to a limit', () => {
    const kids = Array.from({ length: 10 }, () => element());
    const root = page([], [element(kids)]);
    startReveal(root, { Observer: fakeObserver().Observer });

    expect(kids[0].style.transitionDelay).toBe('0ms');
    expect(kids[1].style.transitionDelay).toBe(`${STAGGER_MS}ms`);
    expect(kids[9].style.transitionDelay).toBe(`${MAX_STAGGER_MS}ms`);
  });

  it('cleaning up makes everything visible again', () => {
    const a = element();
    const kid = element();
    const root = page([a], [element([kid])]);
    const { Observer, state } = fakeObserver();
    const stop = startReveal(root, { Observer });
    state.show(a);

    stop();

    expect(state.disconnected).toBe(true);
    expect(root.classList.contains(READY_CLASS)).toBe(false);
    expect(kid.style.transitionDelay).toBe('');
  });
});

describe('REVEAL_CSS', () => {
  it('hides only while the root is ready and the element has not been seen', () => {
    const hiding = REVEAL_CSS.split('}').filter((rule) => rule.includes('opacity: 0'));
    expect(hiding).toHaveLength(1);
    hiding[0]
      .split('{')[0]
      .split(',')
      .forEach((selector) => {
        expect(selector).toContain(`.${READY_CLASS} `);
        expect(selector).toContain(`:not(.${VISIBLE_CLASS})`);
      });
  });

  it('never hides anything under reduced motion', () => {
    expect(REVEAL_CSS).toMatch(/prefers-reduced-motion: reduce[^}]*\{[^}]*opacity: 1 !important/s);
  });
});
