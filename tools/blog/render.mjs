/**
 * @file Turns blog posts into static pages and machine-readable files.
 *
 * The application is a single-page app: its HTML is empty until JavaScript
 * runs, which most crawlers and AI assistants do not do. Blog pages are
 * therefore written as plain HTML at build time, with the answer, headings,
 * tables and structured data already in the markup.
 *
 * Everything here is pure: text in, text out. Files are written by
 * build-blog.mjs.
 */
import { IMAGES, LEGAL_NOTE } from './posts.mjs';
import {
  COMPANY, CONTACT, CONTACT_CHANNELS, LOGIN_PATH, NAV_LINKS, REGISTER_PATH, SITE_NAME, SITE_TAGLINE,
} from '../../src/components/landing/site.js';
import { LOGO_WORDS, logoMarkSvg } from '../../src/components/landing/brand.js';

export { SITE_NAME, SITE_TAGLINE };
export const BLOG_TITLE = 'บทความ: เวลาทำงาน กะ OT และเงินเดือน';
export const BLOG_DESCRIPTION =
  'คำตอบสำหรับฝ่ายบุคคลและเจ้าของกิจการ เรื่องการคิด OT กะข้ามคืน วันหยุด การปิดงวดเงินเดือน และการเลือกระบบ HR';

/** Crawlers of AI assistants that are named in robots.txt so the permission is explicit. */
export const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/**
 * Escape text for use inside HTML, in content and in attribute values.
 * @param {unknown} value - Text to escape.
 * @returns {string} Safe text.
 */
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Serialise structured data for a script tag. `<` is escaped so text in a post
 * can never close the tag early.
 * @param {object} data - JSON-LD object.
 * @returns {string} JSON safe to place inside a script element.
 */
export const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

/**
 * A date as Thai readers write it, in the Buddhist era.
 * @param {string} date - Date in `YYYY-MM-DD` form.
 * @returns {string} Text such as `29 กันยายน 2569`.
 * @throws {RangeError} When the date is malformed.
 */
export const thaiDate = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new RangeError(`Invalid date: ${date}`);
  return `${Number(match[3])} ${THAI_MONTHS[Number(match[2]) - 1]} ${Number(match[1]) + 543}`;
};

/**
 * Normalise the site address: https, no trailing slash.
 * @param {string} value - Address from the environment.
 * @returns {string} Origin such as `https://example.com`.
 * @throws {Error} When the value is not an http(s) address.
 */
export const siteOrigin = (value) => {
  const text = String(value || '').trim();
  const url = new URL(/^https?:\/\//.test(text) ? text : `https://${text}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error(`Invalid site address: ${value}`);
  return url.origin;
};

/** Address of a post. Trailing slash, because the page is a directory index. */
export const postPath = (post) => `/blog/${post.slug}/`;
export const imagePath = (key) => `/blog-images/${IMAGES[key].file}`;

/**
 * Rough reading time for Thai text, which has no spaces between words.
 * @param {object} post - The post.
 * @returns {number} Minutes, at least 1.
 */
export const readingMinutes = (post) => {
  const text = postPlainText(post);
  return Math.max(1, Math.round(text.replace(/\s/g, '').length / 900));
};

/**
 * All the words of a post, without markup.
 * @param {object} post - The post.
 * @returns {string} Plain text.
 */
export const postPlainText = (post) =>
  [
    post.title,
    post.answer,
    ...post.sections.flatMap((s) => [
      s.heading,
      ...(s.paragraphs || []),
      ...(s.list || []),
      ...(s.ordered || []),
      ...(s.table ? [s.table.head, ...s.table.rows].flat() : []),
      ...(s.after || []),
    ]),
    ...post.faq.flatMap((f) => [f.q, f.a]),
  ].join(' ');

/**
 * Problems in a post that would hurt it in search results or mislead a reader.
 * @param {object} post - The post to check.
 * @param {object[]} all - Every post, to check slugs are unique.
 * @returns {string[]} Problems found; empty when the post is sound.
 */
export const validatePost = (post, all) => {
  const problems = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug || '')) problems.push('slug must be lowercase words joined by hyphens');
  if (all.filter((other) => other.slug === post.slug).length > 1) problems.push('slug is used twice');
  if (!post.title || post.title.length > 70) problems.push('title missing or over 70 characters');
  if (!post.description || post.description.length < 70 || post.description.length > 170) problems.push('description must be 70 to 170 characters');
  if (!post.answer || post.answer.length < 80) problems.push('short answer missing or too thin');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || '')) problems.push('date must be YYYY-MM-DD');
  if (!IMAGES[post.image]) problems.push(`unknown image: ${post.image}`);
  if (!Array.isArray(post.sections) || post.sections.length < 3) problems.push('needs at least 3 sections');
  if (!Array.isArray(post.faq) || post.faq.length < 3) problems.push('needs at least 3 FAQ entries');
  if (!Array.isArray(post.keywords) || post.keywords.length < 3) problems.push('needs at least 3 keywords');
  (post.sections || []).forEach((section) => {
    if (section.image && !IMAGES[section.image]) problems.push(`unknown image: ${section.image}`);
    if (section.table && section.table.rows.some((row) => row.length !== section.table.head.length)) {
      problems.push(`table in "${section.heading}" has a row of the wrong width`);
    }
  });
  const text = postPlainText(post).toLowerCase();
  ['empeo', 'humansoft', 'bytehr'].forEach((vendor) => {
    if (text.includes(vendor)) problems.push(`names a vendor: ${vendor}`);
  });
  return problems;
};

/**
 * An anchor id for a heading. Thai has no ASCII form, so headings are numbered.
 * @param {number} index - Zero-based position of the section.
 * @returns {string} Id such as `s1`.
 */
const sectionId = (index) => `s${index + 1}`;

/** @param {string} key - Image key. @param {boolean} eager - True for the first image of the page. */
const figure = (key, eager = false) => {
  const image = IMAGES[key];
  return `<figure>
<img src="${imagePath(key)}" alt="${escapeHtml(image.alt)}" width="1280" height="${image.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
<figcaption>${escapeHtml(image.caption)}</figcaption>
</figure>`;
};

/** @param {{head: string[], rows: string[][]}} table */
const tableHtml = (table) => `<div class="table"><table>
<thead><tr>${table.head.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('')}</tr></thead>
<tbody>
${table.rows.map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`)).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;

/** @param {object} section @param {number} index */
const sectionHtml = (section, index) =>
  [
    `<section aria-labelledby="${sectionId(index)}">`,
    `<h2 id="${sectionId(index)}">${escapeHtml(section.heading)}</h2>`,
    ...(section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`),
    section.table ? tableHtml(section.table) : '',
    section.list ? `<ul>\n${section.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>` : '',
    section.ordered ? `<ol>\n${section.ordered.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}\n</ol>` : '',
    section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : '',
    ...(section.after || []).map((text) => `<p>${escapeHtml(text)}</p>`),
    section.image ? figure(section.image) : '',
    '</section>',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Address of a menu entry as seen from a blog page. Sections of the landing
 * page (`#pricing`) become `/#pricing`; everything else is already absolute.
 * @param {string} href - Address from NAV_LINKS.
 * @returns {string} Address usable outside the landing page.
 */
export const navHref = (href) => (href.startsWith('#') ? `/${href}` : href);

/** Icons drawn inline, the same shapes the landing page uses. */
const PHONE_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const MENU_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>';
const PIN_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
const MAIL_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

/**
 * One contact channel as a list item.
 * @param {{label: string, value: string, href: string|null, icon: string, external?: boolean}} channel
 * @returns {string} Markup.
 */
const channelItem = (channel) => {
  const icon = { phone: PHONE_ICON, mail: MAIL_ICON, pin: PIN_ICON }[channel.icon];
  const value = channel.href
    ? `<a href="${escapeHtml(channel.href)}"${channel.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(channel.value)}</a>`
    : `<span class="value">${escapeHtml(channel.value)}</span>`;
  return `<li>${icon}<span><span class="label">${escapeHtml(channel.label)}: </span>${value}</span></li>`;
};

/** Styles shared by every blog page. Inline, so a page is complete in one request. */
export const STYLES = `
:root{--ink:#0f172a;--soft:#475569;--line:#e2e8f0;--ground:#f8fafc;--card:#fff;--brand:#047857;--link:#1d4ed8}
:root{color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f7faf9;color:var(--ink);font-family:Kanit,'Segoe UI',Tahoma,sans-serif;font-weight:300;line-height:1.75;font-size:17px}
a{color:var(--link)}a:hover{color:#1e3a8a}
.wrap{max-width:780px;margin:0 auto;padding:0 16px}
.site-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.85);border-bottom:1px solid rgba(15,23,42,.07);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.site-nav nav{max-width:1280px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:#0f172a;font-size:18px;font-weight:600;line-height:1}
.logo svg{flex:none}
.logo .word{white-space:nowrap;letter-spacing:-.01em}
.logo .dot{color:#059669}
.logo .names{display:flex;flex-direction:column;gap:3px}
.logo .by{font-size:11px;font-weight:400;color:#64748b}
.nav-links{display:none;align-items:center;gap:20px}
@media (min-width:1280px){.nav-links{gap:28px}}
.nav-links a{font-size:14px;font-weight:400;color:#64748b;text-decoration:none;transition:color .15s}
.nav-links a:hover,.nav-links a[aria-current=page]{color:#0f172a}
.nav-actions{display:flex;align-items:center;gap:12px}
.nav-actions a{font-size:14px;text-decoration:none}
.nav-phone{display:none;align-items:center;gap:6px;font-weight:500;color:#475569}
.nav-phone:hover{color:#047857}
.nav-login{display:none;font-weight:400;color:#475569}
.nav-login:hover{color:#0f172a}
.nav-register{display:inline-flex;align-items:center;min-height:36px;border-radius:12px;background:#059669;padding:8px 16px;font-weight:500;color:#0f172a;box-shadow:0 1px 2px rgba(5,150,105,.2);transition:transform .15s}
.nav-register:hover{transform:scale(1.05);color:#0f172a}
.icon{width:16px;height:16px;flex:none}
.mobile-menu{position:relative}
.mobile-menu summary{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#334155;cursor:pointer;list-style:none}
.mobile-menu summary::-webkit-details-marker{display:none}
.mobile-menu summary .icon{width:20px;height:20px}
.mobile-menu .panel{position:absolute;right:0;top:100%;margin-top:8px;width:256px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;padding:8px;box-shadow:0 10px 15px -3px rgba(15,23,42,.1)}
.mobile-menu .panel a{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;border-radius:8px;font-size:14px;font-weight:400;color:#334155;text-decoration:none}
.mobile-menu .panel a:hover{background:#f8fafc;color:#0f172a}
.mobile-menu hr{border:0;border-top:1px solid #f1f5f9;margin:4px 0}
@media (min-width:1024px){.mobile-menu{display:none}}
@media (min-width:640px){.nav-login{display:block}}
@media (min-width:768px){.nav-phone{display:flex}}
@media (min-width:1024px){.nav-links{display:flex}}
@media (prefers-reduced-motion:reduce){.nav-register,.nav-links a{transition:none}.nav-register:hover{transform:none}}
.crumbs{font-size:14px;color:var(--soft);padding:20px 0 0}
.crumbs a{color:var(--soft)}
h1{font-size:34px;line-height:1.3;font-weight:600;margin:12px 0 8px;text-wrap:balance}
h2,h3{scroll-margin-top:88px}
h2{font-size:24px;line-height:1.35;font-weight:600;margin:40px 0 8px}
h3{font-size:18px;font-weight:600;margin:24px 0 4px}
.meta{color:var(--soft);font-size:14px;margin:0 0 20px}
.answer{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:18px 20px;margin:20px 0}
.answer strong{display:block;font-weight:600;color:#064e3b;margin-bottom:4px}
.answer p{margin:0;color:#064e3b;font-weight:400}
.toc{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 20px;margin:20px 0}
.toc strong{font-weight:600}
.toc ol{margin:6px 0 0;padding-left:22px}
figure{margin:24px 0}
figure img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
figcaption{font-size:14px;color:var(--soft);margin-top:8px;text-align:center}
.table{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:16px}
th,td{padding:10px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
thead th{background:var(--ground);font-weight:600}
tbody th{font-weight:500}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
pre{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:16px;overflow-x:auto;font-size:14px;line-height:1.6}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.faq h3{margin-top:20px}
.note{font-size:14px;color:var(--soft);border-top:1px solid var(--line);margin-top:40px;padding-top:16px}
.cta{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px;margin:40px 0;text-align:center}
.cta p{margin:0 0 14px}
.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:10px;background:var(--link);color:#fff;text-decoration:none;font-weight:500}
.button:hover{background:#1e40af;color:#fff}
.cards{list-style:none;padding:0;margin:24px 0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.cards li{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.cards img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;object-position:top left;border-bottom:1px solid var(--line)}
.cards div{padding:16px 18px 20px}
.cards h2{font-size:19px;margin:0 0 6px}
.cards h2 a{color:var(--ink);text-decoration:none}
.cards h2 a:hover{color:var(--link);text-decoration:underline}
.cards p{margin:0;color:var(--soft);font-size:15px;line-height:1.6}
.wide{max-width:1080px}
footer.site{border-top:1px solid #e2e8f0;background:#fff;margin-top:56px;padding:48px 0;color:#475569;font-size:14px;font-weight:400;line-height:1.6}
footer.site .inner{max-width:1280px;margin:0 auto;padding:0 20px;display:grid;gap:40px}
footer.site h2{font-size:14px;font-weight:600;color:#0f172a;margin:0;scroll-margin-top:0}
footer.site p{margin:4px 0 0}
footer.site .byline{font-weight:500;color:#334155;margin-top:8px}
footer.site ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
footer.site .contact li{display:flex;align-items:flex-start;gap:8px;overflow-wrap:anywhere}
footer.site .contact .icon{width:16px;height:16px;margin-top:3px;color:#047857}
footer.site .label{color:#64748b}
footer.site a{color:#1e293b;text-decoration:none;font-weight:500}
footer.site .value{color:#1e293b}
footer.site nav a{color:#475569;font-weight:400}
footer.site a:hover{color:#047857}
footer.site .legal{max-width:1280px;margin:40px auto 0;padding:24px 20px 0;border-top:1px solid #f1f5f9;color:#64748b}
@media (min-width:768px){footer.site .inner{grid-template-columns:1fr 1fr}}
@media (min-width:1024px){footer.site .inner{grid-template-columns:1fr 2fr 1fr}}
@media (max-width:600px){body{font-size:16px}h1{font-size:27px}h2{font-size:21px}}
`;

/**
 * The parts of a page every blog page shares.
 * @param {object} page
 * @param {string} page.origin - Site origin.
 * @param {string} page.path - Path of the page.
 * @param {string} page.title - Document title.
 * @param {string} page.description - Meta description.
 * @param {string} page.image - Path of the social image.
 * @param {'article'|'website'} page.type - Open Graph type.
 * @param {object[]} page.structured - JSON-LD blocks.
 * @param {string} page.body - Markup of the main content.
 * @param {string} [page.extraHead] - Extra head markup.
 * @param {number} [page.year] - Year shown in the footer; the current year when omitted.
 * @returns {string} A complete HTML document.
 */
export const pageShell = ({ origin, path, title, description, image, type, structured, body, extraHead = '', year = new Date().getFullYear() }) => `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="author" content="${escapeHtml(COMPANY.name)}">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${origin}${path}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:image" content="${origin}${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_TITLE)}" href="${origin}/blog/feed.xml">
${extraHead}<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${STYLES}</style>
${structured.map((data) => `<script type="application/ld+json">${jsonLd(data)}</script>`).join('\n')}
</head>
<body>
<header class="site-nav">
<nav aria-label="เมนูหลัก">
<a class="logo" href="/" aria-label="${SITE_NAME}">${logoMarkSvg(36, 'logo-nav')}<span class="names"><span class="word">${LOGO_WORDS.first} <span class="dot">${LOGO_WORDS.second}</span></span><span class="by">${escapeHtml(COMPANY.byline)}</span></span></a>
<div class="nav-links">
${NAV_LINKS.map((link) => `<a href="${escapeHtml(navHref(link.href))}"${link.href === '/blog/' && path.startsWith('/blog/') ? ' aria-current="page"' : ''}>${escapeHtml(link.label)}</a>`).join('\n')}
</div>
<div class="nav-actions">
<a class="nav-phone" href="${CONTACT.phoneHref}">${PHONE_ICON}${escapeHtml(CONTACT.phoneLabel)}</a>
<a class="nav-login" href="${LOGIN_PATH}">เข้าสู่ระบบ</a>
<a class="nav-register" href="${REGISTER_PATH}">ลงทะเบียน</a>
<details class="mobile-menu">
<summary aria-label="เมนู">${MENU_ICON}</summary>
<div class="panel">
${NAV_LINKS.map((link) => `<a href="${escapeHtml(navHref(link.href))}">${escapeHtml(link.label)}</a>`).join('\n')}
<hr>
<a href="${CONTACT.phoneHref}">${PHONE_ICON}${escapeHtml(CONTACT.phoneLabel)}</a>
<a href="${LOGIN_PATH}">เข้าสู่ระบบ</a>
</div>
</details>
</div>
</nav>
</header>
<main>
${body}
</main>
<footer class="site">
<div class="inner">
<div>
<a class="logo" href="/" aria-label="${SITE_NAME}">${logoMarkSvg(36, 'logo-footer')}<span class="word">${LOGO_WORDS.first} <span class="dot">${LOGO_WORDS.second}</span></span></a>
<p class="byline">${escapeHtml(COMPANY.byline)}</p>
<p>${escapeHtml(SITE_TAGLINE)}</p>
</div>
<div>
<h2>ข้อมูลติดต่อ</h2>
<p>${escapeHtml(COMPANY.name)}</p>
<ul class="contact">
${CONTACT_CHANNELS.map(channelItem).join('\n')}
</ul>
</div>
<nav aria-label="ลิงก์ท้ายหน้า">
<h2>เมนู</h2>
<ul>
<li><a href="/#tour">ดูหน้าจอ</a></li>
<li><a href="/#pricing">ราคา</a></li>
<li><a href="/blog/">บทความ</a></li>
<li><a href="${REGISTER_PATH}">ลงทะเบียน</a></li>
<li><a href="${LOGIN_PATH}">เข้าสู่ระบบ</a></li>
</ul>
</nav>
</div>
<p class="legal">© ${year} ${SITE_NAME} ${escapeHtml(COMPANY.byline)}</p>
</footer>
</body>
</html>
`;

/**
 * The company, as structured data. The product is its brand.
 * @param {string} origin - Site origin.
 * @returns {object} schema.org Organization.
 */
export const organization = (origin) => ({
  '@type': 'Organization',
  '@id': `${origin}/#organization`,
  name: COMPANY.name,
  url: `${origin}/`,
  brand: { '@type': 'Brand', name: SITE_NAME },
  email: CONTACT.email,
  telephone: CONTACT.phoneE164,
  address: { '@type': 'PostalAddress', ...COMPANY.addressParts },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: CONTACT.phoneE164,
      email: CONTACT.email,
      availableLanguage: ['th', 'en'],
      areaServed: 'TH',
    },
  ],
});

/**
 * Structured data of one post: the article, its breadcrumb and its FAQ.
 * @param {object} post - The post.
 * @param {string} origin - Site origin.
 * @returns {object[]} JSON-LD blocks.
 */
export const postStructuredData = (post, origin) => {
  const url = `${origin}${postPath(post)}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      mainEntityOfPage: url,
      headline: post.title,
      description: post.description,
      abstract: post.answer,
      inLanguage: 'th',
      datePublished: post.date,
      dateModified: post.updated || post.date,
      keywords: post.keywords.join(', '),
      image: `${origin}${imagePath(post.image)}`,
      author: organization(origin),
      publisher: organization(origin),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'บทความ', item: `${origin}/blog/` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.q,
        acceptedAnswer: { '@type': 'Answer', text: entry.a },
      })),
    },
  ];
};

/**
 * Posts worth reading next: those sharing the most keywords, newest first on a tie.
 * @param {object} post - The post being read.
 * @param {object[]} all - Every post.
 * @param {number} [count] - How many to return.
 * @returns {object[]} Related posts.
 */
export const relatedPosts = (post, all, count = 3) => {
  const words = new Set(post.keywords.flatMap((keyword) => keyword.toLowerCase().split(/\s+/)));
  return all
    .filter((other) => other.slug !== post.slug)
    .map((other, index) => ({
      other,
      index,
      score: other.keywords.flatMap((keyword) => keyword.toLowerCase().split(/\s+/)).filter((word) => words.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.other);
};

/**
 * One post as a complete page.
 * @param {object} post - The post.
 * @param {object[]} all - Every post, for related links.
 * @param {string} origin - Site origin.
 * @returns {string} HTML document.
 */
export const renderPost = (post, all, origin) => {
  const body = `<article class="wrap">
<nav class="crumbs" aria-label="ตำแหน่งหน้า"><a href="/">หน้าแรก</a> › <a href="/blog/">บทความ</a></nav>
<h1>${escapeHtml(post.title)}</h1>
<p class="meta">เผยแพร่ <time datetime="${post.date}">${thaiDate(post.date)}</time>${post.updated && post.updated !== post.date ? ` · ปรับปรุง <time datetime="${post.updated}">${thaiDate(post.updated)}</time>` : ''} · อ่าน ${readingMinutes(post)} นาที · โดย ${escapeHtml(COMPANY.name)}</p>
<div class="answer"><strong>คำตอบสั้น</strong><p>${escapeHtml(post.answer)}</p></div>
${figure(post.image, true)}
<nav class="toc" aria-label="สารบัญ"><strong>ในบทความนี้</strong><ol>
${post.sections.map((section, i) => `<li><a href="#${sectionId(i)}">${escapeHtml(section.heading)}</a></li>`).join('\n')}
<li><a href="#faq">คำถามที่พบบ่อย</a></li>
</ol></nav>
${post.sections.map(sectionHtml).join('\n')}
<section class="faq" aria-labelledby="faq">
<h2 id="faq">คำถามที่พบบ่อย</h2>
${post.faq.map((entry) => `<h3>${escapeHtml(entry.q)}</h3>\n<p>${escapeHtml(entry.a)}</p>`).join('\n')}
</section>
<aside class="cta"><p>มีกฎการจ่ายค่าจ้างที่ระบบปัจจุบันทำให้ไม่ได้ หรือต้องการให้ข้อมูลเงินเดือนอยู่ในเครื่องของบริษัท</p><a class="button" href="/register">เล่าให้เราฟัง</a></aside>
<section aria-labelledby="related">
<h2 id="related">อ่านต่อ</h2>
<ul>
${relatedPosts(post, all).map((other) => `<li><a href="${postPath(other)}">${escapeHtml(other.title)}</a></li>`).join('\n')}
</ul>
</section>
${post.legal ? `<p class="note">${escapeHtml(LEGAL_NOTE)}</p>` : ''}
</article>`;

  return pageShell({
    origin,
    path: postPath(post),
    title: `${post.title} | ${SITE_NAME}`,
    description: post.description,
    image: imagePath(post.image),
    type: 'article',
    structured: postStructuredData(post, origin),
    body,
    extraHead: `<meta property="article:published_time" content="${post.date}">\n<meta property="article:modified_time" content="${post.updated || post.date}">\n<meta name="keywords" content="${escapeHtml(post.keywords.join(', '))}">\n<link rel="alternate" type="text/markdown" href="${origin}/blog/${post.slug}.md">\n`,
  });
};

/**
 * The list of posts as a page.
 * @param {object[]} posts - Every post, newest first.
 * @param {string} origin - Site origin.
 * @returns {string} HTML document.
 */
export const renderIndex = (posts, origin) =>
  pageShell({
    origin,
    path: '/blog/',
    title: `${BLOG_TITLE} | ${SITE_NAME}`,
    description: BLOG_DESCRIPTION,
    image: imagePath(posts[0].image),
    type: 'website',
    structured: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': `${origin}/blog/#blog`,
        name: BLOG_TITLE,
        description: BLOG_DESCRIPTION,
        url: `${origin}/blog/`,
        inLanguage: 'th',
        publisher: organization(origin),
        blogPost: posts.map((post) => ({
          '@type': 'BlogPosting',
          headline: post.title,
          url: `${origin}${postPath(post)}`,
          datePublished: post.date,
        })),
      },
    ],
    body: `<div class="wrap wide">
<nav class="crumbs" aria-label="ตำแหน่งหน้า"><a href="/">หน้าแรก</a></nav>
<h1>${escapeHtml(BLOG_TITLE)}</h1>
<p class="meta">${escapeHtml(BLOG_DESCRIPTION)}</p>
<ul class="cards">
${posts
  .map(
    (post, i) => `<li>
<a href="${postPath(post)}" tabindex="-1" aria-hidden="true"><img src="${imagePath(post.image)}" alt="" width="1280" height="${IMAGES[post.image].height}" ${i < 3 ? '' : 'loading="lazy" '}decoding="async"></a>
<div><h2><a href="${postPath(post)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.description)}</p></div>
</li>`,
  )
  .join('\n')}
</ul>
</div>`,
  });

/**
 * One post as Markdown, for assistants that prefer text to markup.
 * @param {object} post - The post.
 * @param {string} origin - Site origin.
 * @returns {string} Markdown document.
 */
export const renderMarkdown = (post, origin) => {
  const cell = (text) => String(text).replace(/\|/g, '\\|');
  const parts = [
    `# ${post.title}`,
    `> ${post.description}`,
    `เผยแพร่: ${post.date} · ที่มา: ${origin}${postPath(post)}`,
    `## คำตอบสั้น\n\n${post.answer}`,
    ...post.sections.map((section) =>
      [
        `## ${section.heading}`,
        ...(section.paragraphs || []),
        section.table
          ? [`| ${section.table.head.map(cell).join(' | ')} |`, `| ${section.table.head.map(() => '---').join(' | ')} |`, ...section.table.rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n')
          : '',
        section.list ? section.list.map((item) => `- ${item}`).join('\n') : '',
        section.ordered ? section.ordered.map((item, i) => `${i + 1}. ${item}`).join('\n') : '',
        section.code ? `\`\`\`js\n${section.code}\n\`\`\`` : '',
        ...(section.after || []),
      ]
        .filter(Boolean)
        .join('\n\n'),
    ),
    `## คำถามที่พบบ่อย\n\n${post.faq.map((entry) => `### ${entry.q}\n\n${entry.a}`).join('\n\n')}`,
    post.legal ? `---\n\n${LEGAL_NOTE}` : '',
  ];
  return `${parts.filter(Boolean).join('\n\n')}\n`;
};

/**
 * Sitemap of the public pages.
 * @param {object[]} posts - Every post.
 * @param {string} origin - Site origin.
 * @param {string} today - Build date, `YYYY-MM-DD`.
 * @returns {string} XML document.
 */
export const renderSitemap = (posts, origin, today) => {
  const latest = posts.map((post) => post.updated || post.date).sort().pop() || today;
  const entries = [
    { path: '/', lastmod: today },
    { path: '/blog/', lastmod: latest },
    ...posts.map((post) => ({ path: postPath(post), lastmod: post.updated || post.date })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `<url><loc>${escapeHtml(origin + entry.path)}</loc><lastmod>${entry.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
};

/**
 * robots.txt: public pages open to everyone, the application behind the login closed.
 * @param {string} origin - Site origin.
 * @returns {string} File contents.
 */
export const renderRobots = (origin) => {
  const closed = ['/dashboard', '/employees', '/attendance', '/attendance-calculation', '/ot-requests', '/leave', '/reports', '/payroll/', '/settings', '/profile', '/login'];
  const rules = closed.map((path) => `Disallow: ${path}`).join('\n');
  return `# Public pages and articles may be read, quoted and indexed.
User-agent: *
Allow: /
${rules}

# AI assistants and their crawlers are welcome to the same public pages.
${AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join('\n')}
Allow: /
${rules}

Sitemap: ${origin}/sitemap.xml
`;
};

/**
 * RSS feed of the posts.
 * @param {object[]} posts - Every post, newest first.
 * @param {string} origin - Site origin.
 * @returns {string} XML document.
 */
export const renderFeed = (posts, origin) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeHtml(`${SITE_NAME}: ${BLOG_TITLE}`)}</title>
<link>${origin}/blog/</link>
<description>${escapeHtml(BLOG_DESCRIPTION)}</description>
<language>th</language>
<atom:link href="${origin}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${posts
  .map(
    (post) => `<item>
<title>${escapeHtml(post.title)}</title>
<link>${origin}${postPath(post)}</link>
<guid isPermaLink="true">${origin}${postPath(post)}</guid>
<pubDate>${new Date(`${post.date}T00:00:00+07:00`).toUTCString()}</pubDate>
<description>${escapeHtml(post.answer)}</description>
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`;

/**
 * llms.txt: what the site is, and where the answers are, in plain Markdown.
 * @param {object[]} posts - Every post.
 * @param {string} origin - Site origin.
 * @returns {string} File contents.
 */
export const renderLlmsTxt = (posts, origin) => `# ${SITE_NAME}

> ${SITE_TAGLINE} ระบบเวลาทำงานและเงินเดือนสำหรับโรงงานและธุรกิจหลายกะในประเทศไทย ส่งมอบเป็นโครงการ ติดตั้งบนเซิร์ฟเวอร์ของลูกค้าได้ เชื่อมกับระบบการผลิตและ ERP และส่งมอบซอร์สโค้ด

ภาษาหลักของเว็บไซต์คือภาษาไทย บทความแต่ละเรื่องมีฉบับ Markdown ที่ลิงก์ด้านล่าง ตัวเลขทางกฎหมายอ้างอิงพระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541 พร้อมเลขมาตรา

## หน้าหลัก

- [หน้าแรก](${origin}/): จุดยืนของผลิตภัณฑ์ หน้าจอตัวอย่าง การเทียบกับระบบเช่าใช้รายเดือน และราคา
- [บทความทั้งหมด](${origin}/blog/): ${BLOG_DESCRIPTION}

## บทความ

${posts.map((post) => `- [${post.title}](${origin}/blog/${post.slug}.md): ${post.answer}`).join('\n')}

## ผู้พัฒนาและช่องทางติดต่อ

${SITE_NAME} พัฒนาโดย ${COMPANY.name}

${CONTACT_CHANNELS.map((channel) => `- ${channel.label}: ${channel.value}`).join('\n')}

## ขอบเขต

- ระบบนี้ครอบคลุมทะเบียนพนักงาน เวลาทำงาน กะ OT การลา และเงินเดือน
- ระบบนี้ไม่มีโมดูลสรรหา ประเมินผล OKR หรืออบรม
- ภาพหน้าจอในบทความใช้ข้อมูลตัวอย่าง บางหน้าจอเป็นแบบที่ออกแบบไว้และส่งมอบในโครงการ
`;
