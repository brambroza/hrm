/**
 * @file Site-wide navigation, company and contact details.
 *
 * Read by the landing page, the contact form and the static blog generator
 * (tools/blog/render.mjs), so the menu, the footer and every phone number on
 * the site come from one place. Plain data only: the generator runs in Node.
 */

export const SITE_NAME = 'GoAlong HR';
export const SITE_TAGLINE = 'ระบบเวลาทำงานและเงินเดือนที่เป็นของคุณ';

/** The company behind the product. */
export const COMPANY = {
  name: 'GO Along Co., Ltd.',
  byline: 'by GO Along Co., Ltd.',
  address: '918/288 หมู่ 10 ต.ในคลองบางปลากด อ.พระสมุทรเจดีย์ จ.สมุทรปราการ 10290',
  /** The same address in parts, for structured data. */
  addressParts: {
    streetAddress: '918/288 หมู่ 10 ต.ในคลองบางปลากด',
    addressLocality: 'อ.พระสมุทรเจดีย์',
    addressRegion: 'สมุทรปราการ',
    postalCode: '10290',
    addressCountry: 'TH',
  },
};

/**
 * Top menu. `href` starting with `#` is a section of the landing page; the
 * blog turns it into `/#section`.
 */
export const NAV_LINKS = [
  { href: '#tour', label: 'ดูหน้าจอ' },
  { href: '#why', label: 'ต่างยังไง' },
  { href: '#versus', label: 'เทียบกับระบบเช่าใช้' },
  { href: '#modules', label: 'ฟีเจอร์' },
  { href: '#pricing', label: 'ราคา' },
  { href: '#faq', label: 'คำถามที่พบบ่อย' },
  // A plain link, not a router link: the blog is static HTML outside the app.
  { href: '/blog/', label: 'บทความ' },
  { href: '#contact', label: 'ติดต่อ' },
];

export const CONTACT = {
  phoneLabel: '085-608-3298',
  phoneHref: 'tel:+66856083298',
  /** International form, for structured data. */
  phoneE164: '+66856083298',
  /** Company mailbox; the address shown first. */
  email: 'info@goalong.co.th',
  /** Direct mailbox of the person who answers. */
  personalEmail: 'amnart.gl@gmail.com',
};

/**
 * Every way to reach the company, in the order shown on the site.
 * `icon` names an icon the page and the blog both know how to draw.
 */
export const CONTACT_CHANNELS = [
  { key: 'phone', label: 'โทรศัพท์', value: CONTACT.phoneLabel, href: CONTACT.phoneHref, icon: 'phone' },
  { key: 'email', label: 'อีเมลบริษัท', value: CONTACT.email, href: `mailto:${CONTACT.email}`, icon: 'mail' },
  { key: 'personalEmail', label: 'อีเมล', value: CONTACT.personalEmail, href: `mailto:${CONTACT.personalEmail}`, icon: 'mail' },
  { key: 'address', label: 'ที่อยู่', value: COMPANY.address, href: null, icon: 'pin' },
];

export const LOGIN_PATH = '/login';
export const REGISTER_PATH = '/register';
