/**
 * @file The GoAlong HR logo, as data. The landing page draws it with React and
 * the blog writes it into static HTML, so both read the shapes from here and
 * cannot drift apart. public/favicon.svg is the same drawing.
 *
 * The mark is a letter G with a dot beside it: someone walking alongside.
 */

/** Drawing area of the mark. */
export const LOGO_VIEWBOX = '0 0 64 64';
/** Corner radius of the background tile. */
export const LOGO_RADIUS = 15;
/** The letter G, drawn as one stroke. */
export const LOGO_G_PATH = 'M36.4 17.6A16 16 0 1 0 47 33H34';
/** Stroke width of the letter. */
export const LOGO_STROKE = 6;
/** The dot beside the letter. */
export const LOGO_DOT = { cx: 46.5, cy: 19.5, r: 4 };
/** Colours of the mark. */
export const LOGO_COLORS = { from: '#059669', to: '#14b8a6', letter: '#ffffff', dot: '#a7f3d0' };
/** The two parts of the name; the second is set in the brand colour. */
export const LOGO_WORDS = { first: 'GoAlong', second: 'HR' };

/**
 * The mark as SVG markup, for pages written as text.
 * @param {number} size - Width and height in pixels.
 * @param {string} [gradientId] - Id for the gradient; must be unique on the page.
 * @returns {string} SVG element.
 */
export const logoMarkSvg = (size, gradientId = 'logo-gradient') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
  `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${LOGO_COLORS.from}"/><stop offset="1" stop-color="${LOGO_COLORS.to}"/></linearGradient></defs>` +
  `<rect width="64" height="64" rx="${LOGO_RADIUS}" fill="url(#${gradientId})"/>` +
  `<path d="${LOGO_G_PATH}" fill="none" stroke="${LOGO_COLORS.letter}" stroke-width="${LOGO_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="${LOGO_DOT.cx}" cy="${LOGO_DOT.cy}" r="${LOGO_DOT.r}" fill="${LOGO_COLORS.dot}"/>` +
  '</svg>';
