import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BrandLogo from '../BrandLogo';
import { LOGO_DOT, LOGO_G_PATH, LOGO_WORDS, logoMarkSvg } from '../landing/brand';
import { SITE_NAME } from '../landing/site';

describe('BrandLogo', () => {
  it('spells the product name', () => {
    expect(`${LOGO_WORDS.first} ${LOGO_WORDS.second}`).toBe(SITE_NAME);
    const html = renderToStaticMarkup(<BrandLogo byline="by GO Along Co., Ltd." />);
    expect(html).toContain(`aria-label="${SITE_NAME}"`);
    expect(html).toContain('GoAlong');
    expect(html).toContain('>HR<');
    expect(html).toContain('by GO Along Co., Ltd.');
  });

  it('draws only the mark when asked', () => {
    const html = renderToStaticMarkup(<BrandLogo markOnly />);
    expect(html).toContain(LOGO_G_PATH);
    expect(html).not.toContain('GoAlong<');
    expect(html).toContain(`aria-label="${SITE_NAME}"`);
  });

  it('gives each logo on a page its own gradient', () => {
    const html = renderToStaticMarkup(<div><BrandLogo /><BrandLogo /></div>);
    const ids = [...html.matchAll(/linearGradient id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    ids.forEach((id) => expect(html).toContain(`url(#${id})`));
  });

  it('is the same drawing as the site icon and the static markup', () => {
    const icon = fs.readFileSync(path.resolve(import.meta.dirname, '../../../public/favicon.svg'), 'utf8');
    expect(icon).toContain(`d="${LOGO_G_PATH}"`);
    expect(icon).toContain(`cx="${LOGO_DOT.cx}"`);
    expect(icon).toContain(`aria-label="${SITE_NAME}"`);
    const markup = logoMarkSvg(36, 'x');
    expect(markup).toContain(`d="${LOGO_G_PATH}"`);
    expect(markup).toContain('width="36"');
    expect(markup).toContain('url(#x)');
  });
});
