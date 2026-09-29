/**
 * @file Serves the static blog from the dev and preview servers.
 *
 * The blog is plain HTML in `public/blog/<slug>/index.html`. Vite serves a
 * file in `public` only when the address names the file; for `/blog/` or
 * `/blog/<slug>/` it falls back to the application, whose router sends every
 * unknown address to the login page. This plugin points those addresses at
 * their `index.html` before Vite looks. Production does the same with the
 * rewrites in vercel.json.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The file that answers a blog address.
 * @param {string|undefined} url - Request address, possibly with a query string.
 * @returns {string|null} Address of the static file, or null when the request is not for a blog page.
 */
export const blogStaticPath = (url) => {
  if (typeof url !== 'string') return null;

  const queryAt = url.search(/[?#]/);
  const pathname = queryAt === -1 ? url : url.slice(0, queryAt);
  const query = queryAt === -1 ? '' : url.slice(queryAt);

  if (pathname === '/blog' || pathname === '/blog/') return `/blog/index.html${query}`;

  const match = /^\/blog\/([^/]+)\/?$/.exec(pathname);
  // Files such as feed.xml and <slug>.md carry a dot and are served as they are.
  if (!match || !SLUG.test(match[1])) return null;
  return `/blog/${match[1]}/index.html${query}`;
};

/**
 * Connect middleware that rewrites blog addresses.
 * @param {import('http').IncomingMessage} req - Request.
 * @param {import('http').ServerResponse} _res - Response, untouched.
 * @param {() => void} next - Continues to the next middleware.
 */
const rewrite = (req, _res, next) => {
  const target = blogStaticPath(req.url);
  if (target) req.url = target;
  next();
};

/**
 * Vite plugin: static blog pages in dev and preview.
 * @returns {import('vite').Plugin}
 */
export default function blogStaticPlugin() {
  return {
    name: 'blog-static',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}
