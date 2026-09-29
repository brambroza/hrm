#!/usr/bin/env node
/**
 * @file Writes the blog and the files crawlers look for into `public/`.
 *
 * Output (all generated, none edited by hand):
 *   public/blog/index.html            list of posts
 *   public/blog/<slug>/index.html     one page per post
 *   public/blog/<slug>.md             the same post as Markdown
 *   public/blog/feed.xml              RSS
 *   public/sitemap.xml
 *   public/robots.txt
 *   public/llms.txt
 *
 * The site address comes from SITE_URL, or from the address Vercel gives the
 * production deployment. Without either, local addresses are written and the
 * script says so: canonical links pointing at localhost must not be deployed.
 *
 * Usage: node tools/build-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { IMAGES, POSTS } from './blog/posts.mjs';
import {
  renderFeed, renderIndex, renderLlmsTxt, renderMarkdown, renderPost, renderRobots, renderSitemap,
  siteOrigin, validatePost,
} from './blog/render.mjs';

const LOCAL_ORIGIN = 'http://localhost:3000';

/**
 * Work out the public address of the site.
 * @param {NodeJS.ProcessEnv} env - Environment variables.
 * @returns {{origin: string, local: boolean}} The origin and whether it is only a local stand-in.
 */
export const resolveOrigin = (env) => {
  const configured = env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return { origin: siteOrigin(configured), local: false };
  return { origin: LOCAL_ORIGIN, local: true };
};

/**
 * Write a file, creating its folder.
 * @param {string} file - Absolute path.
 * @param {string} contents - Text to write.
 */
const write = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, 'utf8');
};

/**
 * Build everything.
 * @param {object} options
 * @param {string} options.publicDir - The `public` folder.
 * @param {NodeJS.ProcessEnv} options.env - Environment variables.
 * @param {string} options.today - Build date, `YYYY-MM-DD`.
 * @returns {{origin: string, local: boolean, files: string[], missingImages: string[]}} What was written.
 * @throws {Error} When a post fails validation.
 */
export const build = ({ publicDir, env, today }) => {
  const problems = POSTS.flatMap((post) => validatePost(post, POSTS).map((problem) => `${post.slug}: ${problem}`));
  if (problems.length > 0) throw new Error(`Blog posts have problems:\n- ${problems.join('\n- ')}`);

  const { origin, local } = resolveOrigin(env);
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const files = [];
  const emit = (relative, contents) => {
    write(path.join(publicDir, relative), contents);
    files.push(relative);
  };

  emit('blog/index.html', renderIndex(posts, origin));
  posts.forEach((post) => {
    emit(`blog/${post.slug}/index.html`, renderPost(post, posts, origin));
    emit(`blog/${post.slug}.md`, renderMarkdown(post, origin));
  });
  emit('blog/feed.xml', renderFeed(posts, origin));
  emit('sitemap.xml', renderSitemap(posts, origin, today));
  emit('robots.txt', renderRobots(origin));
  emit('llms.txt', renderLlmsTxt(posts, origin));

  const used = new Set(posts.flatMap((post) => [post.image, ...post.sections.map((section) => section.image).filter(Boolean)]));
  const missingImages = [...used]
    .map((key) => IMAGES[key].file)
    .filter((file) => !fs.existsSync(path.join(publicDir, 'blog-images', file)));

  return { origin, local, files, missingImages };
};

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const result = build({ publicDir: path.join(process.cwd(), 'public'), env: process.env, today });

  console.log(`Blog: wrote ${result.files.length} files for ${result.origin}`);
  if (result.local) {
    console.warn('Blog: SITE_URL is not set, so links point at localhost. Set SITE_URL before deploying.');
  }
  if (result.missingImages.length > 0) {
    console.error(`Blog: missing images in public/blog-images: ${result.missingImages.join(', ')}`);
    process.exit(1);
  }
  // On Vercel a production build without a real address would publish wrong canonical links.
  if (result.local && process.env.VERCEL_ENV === 'production') {
    console.error('Blog: refusing to build for production without SITE_URL.');
    process.exit(1);
  }
}
