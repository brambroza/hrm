import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { IMAGES, LEGAL_NOTE, POSTS } from '../posts.mjs';
import {
  AI_CRAWLERS, escapeHtml, jsonLd, navHref, postPath, postPlainText, postStructuredData, readingMinutes, relatedPosts,
  renderFeed, renderIndex, renderLlmsTxt, renderMarkdown, renderPost, renderRobots, renderSitemap, siteOrigin,
  thaiDate, validatePost,
} from '../render.mjs';
import { build, resolveOrigin } from '../../build-blog.mjs';
import { COMPANY, CONTACT, CONTACT_CHANNELS, NAV_LINKS } from '../../../src/components/landing/site.js';

const ORIGIN = 'https://hrm.example.co.th';

describe('posts', () => {
  it('there are ten', () => {
    expect(POSTS).toHaveLength(10);
  });

  it.each(POSTS.map((post) => [post.slug, post]))('%s passes validation', (_slug, post) => {
    expect(validatePost(post, POSTS)).toEqual([]);
  });

  it('have unique slugs and titles', () => {
    expect(new Set(POSTS.map((post) => post.slug)).size).toBe(POSTS.length);
    expect(new Set(POSTS.map((post) => post.title)).size).toBe(POSTS.length);
  });

  it('never quote rates that change by announcement', () => {
    // Social security and tax figures must come from the current announcement, not from a post.
    POSTS.forEach((post) => {
      const text = postPlainText(post);
      expect(text).not.toMatch(/ประกันสังคม\s*\d+\s*%/);
      expect(text).not.toMatch(/เพดาน[^.]{0,30}\d{2},\d{3}/);
    });
  });

  it('carry the legal note when they cite the law', () => {
    POSTS.filter((post) => /มาตรา\s*\d+/.test(postPlainText(post))).forEach((post) => {
      expect(post.legal, post.slug).toBe(true);
    });
  });

  it('every image has alt text and a caption that says the data is a sample', () => {
    Object.values(IMAGES).forEach((image) => {
      expect(image.alt.length).toBeGreaterThan(30);
      expect(image.caption).toContain('ข้อมูลตัวอย่าง');
      expect(image.file).toMatch(/^[a-z0-9-]+\.png$/);
      expect(image.height).toBeGreaterThan(300);
    });
  });

  it('the worked overtime example is arithmetically right', () => {
    expect(22500 / 30 / 8).toBe(93.75);
    expect(Math.round(93.75 * 1.5 * 12.5 * 100) / 100).toBe(1757.81);
    expect(postPlainText(POSTS[0])).toContain('1,757.81');
  });

  it('the ID check example matches the algorithm', () => {
    const digits = '123456789012';
    const sum = digits.split('').reduce((total, digit, i) => total + Number(digit) * (13 - i), 0);
    expect(sum).toBe(352);
    expect((11 - (sum % 11)) % 10).toBe(1);
  });
});

describe('validatePost', () => {
  const good = POSTS[0];

  it('reports what is wrong', () => {
    const problems = validatePost(
      { ...good, slug: 'Bad Slug', title: '', description: 'สั้น', answer: '', date: '29/09/2026', image: 'nope', sections: [], faq: [], keywords: [] },
      [good],
    );
    expect(problems).toEqual(
      expect.arrayContaining([
        'slug must be lowercase words joined by hyphens',
        'title missing or over 70 characters',
        'description must be 70 to 170 characters',
        'short answer missing or too thin',
        'date must be YYYY-MM-DD',
        'unknown image: nope',
        'needs at least 3 sections',
        'needs at least 3 FAQ entries',
        'needs at least 3 keywords',
      ]),
    );
  });

  it('catches a duplicate slug, a ragged table and a named vendor', () => {
    expect(validatePost(good, [good, { ...good }])).toContain('slug is used twice');

    const ragged = { ...good, sections: [{ heading: 'x', table: { head: ['a', 'b'], rows: [['1']] } }, ...good.sections] };
    expect(validatePost(ragged, [ragged]).join()).toContain('row of the wrong width');

    const named = { ...good, answer: `${good.answer} ดีกว่า HumanSoft` };
    expect(validatePost(named, [named])).toContain('names a vendor: humansoft');
  });
});

describe('helpers', () => {
  it('escapes markup', () => {
    expect(escapeHtml('<a href="x">\'&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&lt;/a&gt;');
    expect(escapeHtml(null)).toBe('');
  });

  it('keeps structured data from closing its script tag', () => {
    const out = jsonLd({ text: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).text).toBe('</script><script>alert(1)</script>');
  });

  it('writes dates in the Buddhist era', () => {
    expect(thaiDate('2026-09-29')).toBe('29 กันยายน 2569');
    expect(thaiDate('2026-01-01')).toBe('1 มกราคม 2569');
    expect(() => thaiDate('2026-13-01')).toThrow(RangeError);
    expect(() => thaiDate('yesterday')).toThrow(RangeError);
  });

  it('normalises the site address', () => {
    expect(siteOrigin('hrm.example.co.th')).toBe('https://hrm.example.co.th');
    expect(siteOrigin('https://hrm.example.co.th/')).toBe('https://hrm.example.co.th');
    expect(siteOrigin(' https://hrm.example.co.th/blog ')).toBe('https://hrm.example.co.th');
    expect(() => siteOrigin('')).toThrow();
  });

  it('estimates reading time', () => {
    POSTS.forEach((post) => expect(readingMinutes(post)).toBeGreaterThanOrEqual(1));
  });

  it('suggests other posts, never the post itself', () => {
    POSTS.forEach((post) => {
      const related = relatedPosts(post, POSTS);
      expect(related).toHaveLength(3);
      expect(related.map((other) => other.slug)).not.toContain(post.slug);
    });
    expect(relatedPosts(POSTS[0], POSTS).map((p) => p.slug)).toContain('kha-kham-khuen-nap-wan-tham-ngan');
  });
});

describe('renderPost', () => {
  const post = POSTS[0];
  const html = renderPost(post, POSTS, ORIGIN);

  it('is a complete Thai document readable without JavaScript', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="th">');
    expect(html).toContain(`<h1>${post.title}</h1>`);
    expect(html).toContain(post.answer);
    expect(html).not.toContain('<div id="root">');
    // The only scripts are structured data.
    expect(html.match(/<script(?! type="application\/ld\+json")/g)).toBeNull();
  });

  it('has exactly one h1 and headings in order', () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });

  it('has the tags search engines read', () => {
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/blog/${post.slug}/">`);
    expect(html).toContain(`<meta name="description" content="${post.description}">`);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/blog-images/`);
    expect(html).toContain('<meta property="article:published_time" content="2026-09-29">');
    expect(html).toContain(`href="${ORIGIN}/blog/${post.slug}.md"`);
  });

  it('carries article, breadcrumb and FAQ structured data that parses', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
    expect(blocks.map((block) => block['@type'])).toEqual(['BlogPosting', 'BreadcrumbList', 'FAQPage']);
    expect(blocks[0]).toMatchObject({ headline: post.title, inLanguage: 'th', datePublished: post.date, abstract: post.answer });
    expect(blocks[1].itemListElement).toHaveLength(3);
    expect(blocks[2].mainEntity).toHaveLength(post.faq.length);
    expect(blocks[2].mainEntity[0].acceptedAnswer.text).toBe(post.faq[0].a);
  });

  it('the FAQ in the markup is the FAQ in the structured data', () => {
    post.faq.forEach((entry) => {
      expect(html).toContain(`<h3>${escapeHtml(entry.q)}</h3>`);
      expect(html).toContain(`<p>${escapeHtml(entry.a)}</p>`);
    });
  });

  it('images have alt text, dimensions and a caption', () => {
    const images = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(images.length).toBeGreaterThanOrEqual(1);
    images.forEach((tag) => {
      expect(tag).toMatch(/alt="[^"]{30,}"/);
      expect(tag).toMatch(/width="\d+" height="\d+"/);
    });
    // The first image is the largest thing on screen, so it is not lazy.
    expect(images[0]).toContain('fetchpriority="high"');
    expect(images[0]).not.toContain('loading="lazy"');
    expect(html).toContain('<figcaption>');
  });

  it('table cells in the first column are row headers', () => {
    expect(html).toContain('<th scope="col">');
    expect(html).toContain('<th scope="row">');
  });

  it('links to the contents, related posts and the contact form', () => {
    expect(html).toContain('<a href="#s1">');
    expect(html).toContain('<a href="#faq">');
    expect(html).toContain('href="/register"');
    expect((html.match(/href="\/blog\/[a-z0-9-]+\/"/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('adds the legal note only to posts that cite the law', () => {
    expect(html).toContain(LEGAL_NOTE);
    const plain = POSTS.find((p) => !p.legal);
    expect(renderPost(plain, POSTS, ORIGIN)).not.toContain(LEGAL_NOTE);
  });

  it('escapes code samples', () => {
    const code = renderPost(POSTS.find((p) => p.slug === 'truat-lek-bat-prachachon-13-lak'), POSTS, ORIGIN);
    expect(code).toContain('<pre><code>function isValidThaiId(value)');
    expect(code).toContain('i &lt; 12');
  });

  it.each(POSTS.map((p) => [p.slug, p]))('%s renders', (_slug, each) => {
    const out = renderPost(each, POSTS, ORIGIN);
    expect(out).toContain(`<h1>${escapeHtml(each.title)}</h1>`);
    expect(out.match(/<h1[ >]/g)).toHaveLength(1);
    expect(out).not.toContain('undefined');
    expect(out).not.toContain('[object Object]');
  });
});

describe('top menu and footer match the landing page', () => {
  const html = renderPost(POSTS[0], POSTS, ORIGIN);
  const header = /<header class="site-nav">.*?<\/header>/s.exec(html)[0];
  const footer = /<footer class="site">.*?<\/footer>/s.exec(html)[0];

  it('turns landing sections into addresses that work from the blog', () => {
    expect(navHref('#pricing')).toBe('/#pricing');
    expect(navHref('/blog/')).toBe('/blog/');
  });

  it('shows every menu entry of the landing page, in the same order', () => {
    const desktop = /<div class="nav-links">.*?<\/div>/s.exec(header)[0];
    const labels = [...desktop.matchAll(/<a href="[^"]*"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
    expect(labels.slice(0, NAV_LINKS.length)).toEqual(NAV_LINKS.map((link) => link.label));
    NAV_LINKS.forEach((link) => expect(header).toContain(`href="${navHref(link.href)}"`));
    // No link in the menu points at a bare section, which would do nothing on a blog page.
    expect(header).not.toMatch(/href="#/);
  });

  it('has the phone number, sign in and register, as the landing page does', () => {
    expect(header).toContain(`href="${CONTACT.phoneHref}"`);
    expect(header).toContain(CONTACT.phoneLabel);
    expect(header).toContain('href="/login"');
    expect(header).toContain('href="/register"');
    expect(header).toContain('HRM<span class="dot">.</span>Suite');
  });

  it('offers the same links on a narrow screen, without needing a script', () => {
    const menu = /<details class="mobile-menu">.*?<\/details>/s.exec(header)[0];
    expect(menu).toContain('<summary aria-label="เมนู">');
    NAV_LINKS.forEach((link) => expect(menu).toContain(`href="${navHref(link.href)}"`));
    expect(menu).toContain(`href="${CONTACT.phoneHref}"`);
    expect(menu).toContain('href="/login"');
  });

  it('marks the blog as the current page', () => {
    expect(header.match(/aria-current="page"/g)).toHaveLength(1);
    expect(header).toContain('<a href="/blog/" aria-current="page">');
  });

  it('names the company beside the logo and in the footer', () => {
    expect(header).toContain(COMPANY.byline);
    expect(footer).toContain(COMPANY.byline);
    expect(footer).toContain(COMPANY.name);
    expect(renderIndex(POSTS, ORIGIN)).toContain(`© ${new Date().getFullYear()} HRM Suite ${COMPANY.byline}`);
  });

  it('footer lists every contact channel', () => {
    CONTACT_CHANNELS.forEach((channel) => {
      expect(footer, channel.key).toContain(channel.label);
      expect(footer, channel.key).toContain(channel.value);
      if (channel.href) expect(footer, channel.key).toContain(`href="${channel.href}"`);
    });
    expect(footer).toContain('href="/#pricing"');
    expect(footer).toContain('href="/login"');
  });

  it('does not mention LINE', () => {
    expect(html.toLowerCase()).not.toContain('line.me');
    expect(html).not.toContain('queuebooking');
    expect(renderLlmsTxt(POSTS, ORIGIN)).not.toContain('queuebooking');
    expect(CONTACT_CHANNELS.map((channel) => channel.key)).toEqual(['phone', 'email', 'personalEmail', 'address']);
  });

  it('is light only', () => {
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain(':root{color-scheme:light}');
    expect(html).not.toContain('prefers-color-scheme');
  });

  it('the index page has the same menu and footer', () => {
    const index = renderIndex(POSTS, ORIGIN);
    expect(/<header class="site-nav">.*?<\/header>/s.exec(index)[0]).toBe(header);
    expect(/<footer class="site">.*?<\/footer>/s.exec(index)[0]).toBe(footer);
  });
});

describe('renderIndex', () => {
  const html = renderIndex(POSTS, ORIGIN);

  it('lists every post once with a link', () => {
    POSTS.forEach((post) => {
      expect(html).toContain(`<h2><a href="${postPath(post)}">`);
    });
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/blog/">`);
  });

  it('carries Blog structured data', () => {
    const data = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);
    expect(data['@type']).toBe('Blog');
    expect(data.blogPost).toHaveLength(POSTS.length);
  });
});

describe('renderMarkdown', () => {
  it('gives the answer first and keeps tables, lists and code', () => {
    const md = renderMarkdown(POSTS[0], ORIGIN);
    expect(md.startsWith(`# ${POSTS[0].title}\n`)).toBe(true);
    expect(md.indexOf('## คำตอบสั้น')).toBeLessThan(md.indexOf(`## ${POSTS[0].sections[0].heading}`));
    expect(md).toContain('| กรณี | อัตราขั้นต่ำ | มาตรา |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('- ค่าจ้างต่อชั่วโมง 93.75 บาท');
    expect(md).toContain(`${ORIGIN}/blog/${POSTS[0].slug}/`);

    const code = renderMarkdown(POSTS.find((p) => p.slug === 'truat-lek-bat-prachachon-13-lak'), ORIGIN);
    expect(code).toContain('```js\nfunction isValidThaiId(value)');
    expect(code).toContain('i < 12');
  });
});

describe('contact details', () => {
  it('phone numbers agree with each other', () => {
    const digits = CONTACT.phoneLabel.replace(/\D/g, '');
    expect(digits).toMatch(/^0\d{9}$/);
    expect(CONTACT.phoneE164).toBe(`+66${digits.slice(1)}`);
    expect(CONTACT.phoneHref).toBe(`tel:${CONTACT.phoneE164}`);
  });

  it('addresses are well formed', () => {
    expect(CONTACT.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z.]+$/);
    expect(CONTACT.personalEmail).toMatch(/^[^\s@]+@[^\s@]+\.[a-z.]+$/);
    expect(COMPANY.address).toContain(COMPANY.addressParts.postalCode);
  });

  it('structured data names the company and how to reach it', () => {
    const [article] = postStructuredData(POSTS[0], ORIGIN);
    expect(article.publisher).toMatchObject({
      '@type': 'Organization',
      name: COMPANY.name,
      telephone: CONTACT.phoneE164,
      email: CONTACT.email,
      brand: { name: 'HRM Suite' },
    });
    expect(article.publisher.address).toMatchObject({ '@type': 'PostalAddress', postalCode: '10290', addressCountry: 'TH' });
  });

  it('llms.txt says who makes the product and how to reach them', () => {
    const txt = renderLlmsTxt(POSTS, ORIGIN);
    expect(txt).toContain(`พัฒนาโดย ${COMPANY.name}`);
    CONTACT_CHANNELS.forEach((channel) => expect(txt).toContain(`- ${channel.label}: ${channel.value}`));
  });
});

describe('sitemap, robots, feed and llms.txt', () => {
  it('sitemap lists the home page, the blog and every post with absolute addresses', () => {
    const xml = renderSitemap(POSTS, ORIGIN, '2026-09-30');
    expect(xml.match(/<url>/g)).toHaveLength(POSTS.length + 2);
    expect(xml).toContain(`<loc>${ORIGIN}/</loc><lastmod>2026-09-30</lastmod>`);
    POSTS.forEach((post) => expect(xml).toContain(`<loc>${ORIGIN}/blog/${post.slug}/</loc>`));
    expect(xml).not.toMatch(/<loc>\//);
  });

  it('robots opens the public pages, closes the application, and names the AI crawlers', () => {
    const txt = renderRobots(ORIGIN);
    expect(txt).toContain('User-agent: *\nAllow: /');
    ['/dashboard', '/payroll/', '/settings', '/employees'].forEach((path) => expect(txt).toContain(`Disallow: ${path}`));
    expect(txt).not.toContain('Disallow: /blog');
    expect(txt).not.toMatch(/^Disallow: \/$/m);
    AI_CRAWLERS.forEach((agent) => expect(txt).toContain(`User-agent: ${agent}`));
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it('feed has an item per post with a valid date', () => {
    const xml = renderFeed(POSTS, ORIGIN);
    expect(xml.match(/<item>/g)).toHaveLength(POSTS.length);
    expect(xml).toContain('<pubDate>Mon, 28 Sep 2026 17:00:00 GMT</pubDate>');
    expect(xml).toContain('<language>th</language>');
  });

  it('llms.txt says what the product is and is not, and links the Markdown of every post', () => {
    const txt = renderLlmsTxt(POSTS, ORIGIN);
    expect(txt.startsWith('# HRM Suite\n')).toBe(true);
    POSTS.forEach((post) => expect(txt).toContain(`(${ORIGIN}/blog/${post.slug}.md)`));
    expect(txt).toContain('ไม่มีโมดูลสรรหา');
    expect(txt).toContain('ข้อมูลตัวอย่าง');
  });

  it('structured data addresses are absolute', () => {
    const [article] = postStructuredData(POSTS[0], ORIGIN);
    expect(article.image.startsWith(`${ORIGIN}/blog-images/`)).toBe(true);
    expect(article.mainEntityOfPage).toBe(`${ORIGIN}/blog/${POSTS[0].slug}/`);
  });
});

describe('build', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-build-'));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('uses SITE_URL, then the Vercel production address, then a local stand-in', () => {
    expect(resolveOrigin({ SITE_URL: 'https://a.example', VERCEL_PROJECT_PRODUCTION_URL: 'b.example' })).toEqual({ origin: 'https://a.example', local: false });
    expect(resolveOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'b.example' })).toEqual({ origin: 'https://b.example', local: false });
    expect(resolveOrigin({})).toEqual({ origin: 'http://localhost:3000', local: true });
  });

  it('writes every file and reports images that are not there', () => {
    const result = build({ publicDir: dir, env: { SITE_URL: ORIGIN }, today: '2026-09-30' });

    expect(result.origin).toBe(ORIGIN);
    expect(result.files).toHaveLength(1 + POSTS.length * 2 + 4);
    ['blog/index.html', 'blog/feed.xml', 'sitemap.xml', 'robots.txt', 'llms.txt'].forEach((file) => {
      expect(fs.existsSync(path.join(dir, file)), file).toBe(true);
    });
    POSTS.forEach((post) => {
      expect(fs.existsSync(path.join(dir, 'blog', post.slug, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'blog', `${post.slug}.md`))).toBe(true);
    });
    // The temporary folder has no screenshots.
    expect(result.missingImages.length).toBeGreaterThan(0);
  });

  it('the screenshots in the repository are the size the markup says', () => {
    Object.values(IMAGES).forEach((image) => {
      const file = path.resolve(import.meta.dirname, '../../../public/blog-images', image.file);
      const header = fs.readFileSync(file).subarray(0, 24);
      expect(header.subarray(1, 4).toString(), image.file).toBe('PNG');
      expect(header.readUInt32BE(16), `${image.file} width`).toBe(1280);
      expect(header.readUInt32BE(20), `${image.file} height`).toBe(image.height);
    });
  });

  it('finds the images once they exist', () => {
    fs.mkdirSync(path.join(dir, 'blog-images'), { recursive: true });
    Object.values(IMAGES).forEach((image) => fs.writeFileSync(path.join(dir, 'blog-images', image.file), ''));
    expect(build({ publicDir: dir, env: { SITE_URL: ORIGIN }, today: '2026-09-30' }).missingImages).toEqual([]);
  });
});
