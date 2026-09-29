import { describe, expect, it } from 'vitest';
import { blogStaticPath } from '../vite-plugin-blog-static.js';
import { POSTS } from '../../tools/blog/posts.mjs';

describe('blogStaticPath', () => {
  it('sends the blog index to its file, with or without the slash', () => {
    expect(blogStaticPath('/blog')).toBe('/blog/index.html');
    expect(blogStaticPath('/blog/')).toBe('/blog/index.html');
  });

  it('sends a post to its file, with or without the slash', () => {
    expect(blogStaticPath('/blog/ot-kham-thiang-khuen')).toBe('/blog/ot-kham-thiang-khuen/index.html');
    expect(blogStaticPath('/blog/ot-kham-thiang-khuen/')).toBe('/blog/ot-kham-thiang-khuen/index.html');
  });

  it('keeps the query string', () => {
    expect(blogStaticPath('/blog/?utm_source=line')).toBe('/blog/index.html?utm_source=line');
    expect(blogStaticPath('/blog/ot-kham-thiang-khuen?x=1')).toBe('/blog/ot-kham-thiang-khuen/index.html?x=1');
  });

  it('leaves real files alone', () => {
    expect(blogStaticPath('/blog/feed.xml')).toBeNull();
    expect(blogStaticPath('/blog/ot-kham-thiang-khuen.md')).toBeNull();
    expect(blogStaticPath('/blog/index.html')).toBeNull();
    expect(blogStaticPath('/blog/ot-kham-thiang-khuen/index.html')).toBeNull();
    expect(blogStaticPath('/blog-images/inbox.png')).toBeNull();
  });

  it('leaves the application alone', () => {
    ['/', '/login', '/dashboard', '/settings/setup', '/blogger', '/src/main.jsx', '/@vite/client'].forEach((url) => {
      expect(blogStaticPath(url), url).toBeNull();
    });
  });

  it('refuses addresses that try to leave the blog folder', () => {
    expect(blogStaticPath('/blog/../.env')).toBeNull();
    expect(blogStaticPath('/blog/..')).toBeNull();
    expect(blogStaticPath('/blog/%2e%2e/secret')).toBeNull();
    expect(blogStaticPath('/blog/UPPER')).toBeNull();
    expect(blogStaticPath(undefined)).toBeNull();
  });

  it('covers every post that exists', () => {
    POSTS.forEach((post) => {
      expect(blogStaticPath(`/blog/${post.slug}/`)).toBe(`/blog/${post.slug}/index.html`);
    });
  });
});
