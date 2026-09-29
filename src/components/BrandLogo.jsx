import React, { useId } from 'react';
import {
  LOGO_COLORS, LOGO_DOT, LOGO_G_PATH, LOGO_RADIUS, LOGO_STROKE, LOGO_VIEWBOX, LOGO_WORDS,
} from '@/components/landing/brand';
import { SITE_NAME } from '@/components/landing/site';

/**
 * The logo mark alone.
 * @param {{ size?: number, className?: string }} props - Size in pixels and extra classes.
 * @returns {JSX.Element} The mark.
 */
export const BrandMark = ({ size = 36, className = '' }) => {
  // Several logos can be on one page; each needs its own gradient id.
  const gradientId = `logo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox={LOGO_VIEWBOX} width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={LOGO_COLORS.from} />
          <stop offset="1" stopColor={LOGO_COLORS.to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={LOGO_RADIUS} fill={`url(#${gradientId})`} />
      <path d={LOGO_G_PATH} fill="none" stroke={LOGO_COLORS.letter} strokeWidth={LOGO_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={LOGO_COLORS.dot} />
    </svg>
  );
};

/**
 * The logo: mark, name and an optional line under the name.
 * @param {{ size?: number, byline?: string, markOnly?: boolean, textClassName?: string }} props - How to draw it.
 * @returns {JSX.Element} The logo.
 */
const BrandLogo = ({ size = 36, byline = '', markOnly = false, textClassName = 'text-lg' }) => (
  <span className="inline-flex items-center gap-2" aria-label={SITE_NAME}>
    <BrandMark size={size} />
    {!markOnly && (
      <span className="flex flex-col leading-tight" aria-hidden="true">
        <span className={`whitespace-nowrap font-semibold tracking-tight text-slate-900 ${textClassName}`}>
          {LOGO_WORDS.first} <span className="text-emerald-600">{LOGO_WORDS.second}</span>
        </span>
        {byline && <span className="text-[11px] font-normal text-slate-500">{byline}</span>}
      </span>
    )}
  </span>
);

export default BrandLogo;
