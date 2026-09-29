import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import gsap from 'gsap';
import { REVEAL_CSS, startReveal } from '@/lib/revealOnScroll';
import {
  ArrowRight, Check, ChevronDown, Users, Clock, Timer, CalendarDays, Wallet,
  FileBarChart, Building2, ShieldCheck, Sparkles, Phone, Mail, LineChart, Zap,
  Sliders, TrendingDown, Server, Plus, ShieldQuestion, ListChecks, FileUp, Scale, Minus, Menu, MapPin,
} from 'lucide-react';
import ProductMock from '@/components/landing/ProductMock';
import {
  STATS, WEDGES, PAINS, MODULES, FLOW, CORE, RULE_PACKS, EXAMPLE_BUILDS, FAQS, DAILY_STEPS, TOUR, COMPARE,
} from '@/components/landing/data';
import BrandLogo from '@/components/BrandLogo';
import { COMPANY, CONTACT, CONTACT_CHANNELS, NAV_LINKS, SITE_NAME, SITE_TAGLINE } from '@/components/landing/site';

/** Icon lookup so module data can stay serialisable. */
const ICONS = {
  Users, Clock, Timer, CalendarDays, Wallet, FileBarChart, Building2, ShieldCheck, Sliders, TrendingDown, Server,
  ListChecks, FileUp, Scale,
};


/**
 * Splits a string into per-word spans so GSAP can stagger them without the SplitText plugin.
 * @param {string} text - Text to split.
 * @param {string} [className] - Extra classes applied to every word span.
 *
 * Thai stacks marks above the letters (ที่, เครื่อง) and hangs vowels below them
 * (คุณ, อยู่), well outside a line box this tight. The outer span clips, for the
 * slide-up entrance, and the gradient paints only inside the inner span's box,
 * so both would cut those marks off. The inner span is padded to hold them and
 * the outer span takes the padding back with negative margins, which leaves
 * the line spacing as it was.
 *
 * @returns {JSX.Element[]} Word elements ready to animate.
 */
const splitWords = (text, className = '') =>
  text.split(' ').map((word, i) => (
    <span key={`${word}-${i}`} className="-mb-[0.35em] -mt-[0.3em] inline-block overflow-hidden align-bottom">
      <span className={`hero-word inline-block pb-[0.35em] pt-[0.3em] ${className}`}>{word}&nbsp;</span>
    </span>
  ));

/** Icons of the contact channels, by the name used in site.js. */
const CHANNEL_ICONS = { phone: Phone, mail: Mail, pin: MapPin };

/** Section heading with an eyebrow label; animated by the shared reveal trigger. */
const SectionHead = ({ eyebrow, title, sub, center = true }) => (
  <div className={`reveal max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
      <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
    </span>
    <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">{title}</h2>
    {sub && <p className="mt-4 text-base leading-relaxed text-slate-500">{sub}</p>}
  </div>
);

/** Collapsible FAQ row. */
const FaqItem = ({ item, open, onToggle }) => {
  const bodyRef = useRef(null);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    gsap.to(el, {
      height: open ? el.scrollHeight : 0,
      opacity: open ? 1 : 0,
      duration: 0.35,
      ease: 'power2.out',
    });
  }, [open]);

  return (
    <div className="reveal rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-slate-800 sm:text-base">{item.q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div ref={bodyRef} className="h-0 overflow-hidden opacity-0">
        <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500">{item.a}</p>
      </div>
    </div>
  );
};

/** Public marketing page: product showcase for the HRM system. */
const LandingPage = () => {
  const root = useRef(null);
  const heroMockRef = useRef(null);
  const tourMockRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const [tab, setTab] = useState(TOUR[0].id);
  const activeTour = TOUR.find((item) => item.id === tab) || TOUR[0];
  const [openFaq, setOpenFaq] = useState(0);

  /**
   * Motion is decoration. Everything on the page is visible without it; the
   * hero plays once at load, and sections fade in as they are reached.
   */
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
        .from('.hero-word', { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.045 }, '-=0.3')
        .from('.hero-fade', { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.5')
        .from(heroMockRef.current, { y: 60, opacity: 0, rotateX: 18, duration: 1.1 }, '-=0.6')
        .from('.hero-orb', { scale: 0.4, opacity: 0, duration: 1.4, stagger: 0.15 }, 0);

      gsap.to('.marquee-track', { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    }, root);

    const stopReveal = startReveal(root.current, { reducedMotion });

    /** The menu gets a background once the page has moved under it. */
    const nav = root.current?.querySelector('.site-nav');
    const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      stopReveal();
      ctx.revert();
    };
  }, []);

  /** Animates the tour screenshot whenever the active module tab changes. */
  useLayoutEffect(() => {
    if (!tourMockRef.current) return;
    const anim = gsap.fromTo(
      tourMockRef.current,
      { opacity: 0, y: 24, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
    );
    return () => anim.kill();
  }, [tab]);

  return (
    <div ref={root} className="min-h-screen bg-[#f7faf9] text-slate-700 antialiased">
      <Helmet>
        <title>ระบบเงินเดือนและเวลาทำงานที่เป็นของคุณ | ติดตั้งในเครื่องของบริษัท เชื่อมระบบที่มีอยู่</title>
        <meta
          name="description"
          content="ระบบเวลาทำงานและเงินเดือนแบบโครงการเหมาจ่าย สำหรับโรงงานและธุรกิจหลายกะ ติดตั้งบนเซิร์ฟเวอร์ของบริษัทได้ เชื่อมระบบการผลิตและ ERP ส่งมอบซอร์สโค้ด และเดินคู่ขนานก่อนใช้จริง"
        />
        <style>{`
          html { scroll-behavior: smooth; }
          .site-nav { transition: background-color .3s ease, border-color .3s ease, backdrop-filter .3s ease; }
          .site-nav.is-scrolled { background-color: rgba(255,255,255,.85); border-color: rgba(15,23,42,.07); backdrop-filter: blur(12px); }
          .grid-bg {
            background-image: linear-gradient(rgba(16,120,86,.07) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(16,120,86,.07) 1px, transparent 1px);
            background-size: 64px 64px;
            mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
          }
          ${REVEAL_CSS}
          section[id] { scroll-margin-top: 88px; }
          .mobile-menu summary::-webkit-details-marker { display: none; }
          .text-gradient { background: linear-gradient(120deg,#34d399,#10b981 45%,#5eead4); -webkit-background-clip: text; background-clip: text; color: transparent; }
        `}</style>
      </Helmet>

      {/* ---------------- NAV ---------------- */}
      <header className="site-nav fixed inset-x-0 top-0 z-50 border-b border-transparent">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#top" className="flex items-center">
            <BrandLogo byline={COMPANY.byline} />
          </a>

          <div className="hidden items-center gap-5 lg:flex xl:gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={CONTACT.phoneHref}
              className="hidden items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 md:flex"
            >
              <Phone className="h-4 w-4" /> {CONTACT.phoneLabel}
            </a>
            <Link to="/login" className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 sm:block">
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-emerald-600/20 transition-transform hover:scale-105"
            >
              ลงทะเบียน
            </Link>
            {/* On narrow screens the links above are hidden; this holds them.
                A details element opens without any script, as on the blog. */}
            <details ref={mobileMenuRef} className="mobile-menu relative lg:hidden">
              <summary
                aria-label="เมนู"
                className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => mobileMenuRef.current?.removeAttribute('open')}
                    className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <a href={CONTACT.phoneHref} className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Phone className="h-4 w-4" aria-hidden="true" /> {CONTACT.phoneLabel}
                </a>
                <Link to="/login" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-50">
                  เข้าสู่ระบบ
                </Link>
              </div>
            </details>
          </div>
        </nav>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section id="top" className="hero relative overflow-hidden pt-32 pb-20 sm:pt-40">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="hero-orb pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-emerald-200/70 blur-[120px]" />
        <div className="hero-orb pointer-events-none absolute top-20 right-10 h-80 w-80 rounded-full bg-teal-200/60 blur-[120px]" />
        <div className="hero-orb pointer-events-none absolute top-60 left-0 h-72 w-72 rounded-full bg-lime-200/60 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-4xl text-center">
            <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              สำหรับโรงงานและธุรกิจหลายกะ ที่ต้องการเป็นเจ้าของระบบเอง
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.3] tracking-tight text-slate-900 [text-wrap:balance] sm:text-6xl sm:leading-[1.3] lg:text-7xl lg:leading-[1.3]">
              {splitWords('ระบบเงินเดือนที่เป็นของคุณ')}
              <br className="hidden sm:block" />
              {splitWords('อยู่ในเครื่องของคุณ', 'text-gradient')}
            </h1>

            <p className="hero-fade mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
              ติดตั้งบนเซิร์ฟเวอร์ของบริษัทได้ เชื่อมกับระบบการผลิตและ ERP ที่คุณมีอยู่
              ตั้งสูตรตามระเบียบการทำงานของคุณ และทุกยอดกดดูที่มาได้
              จ่ายเป็นโครงการครั้งเดียว ส่งมอบซอร์สโค้ด
            </p>

            <div className="hero-fade mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-600/20 transition-transform hover:scale-105 sm:w-auto"
              >
                ลงทะเบียนรับการติดต่อกลับ
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#tour"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
              >
                ลองกดหน้าจอดู
              </a>
            </div>

            <p className="hero-fade mt-4 text-xs text-slate-400">
              เดินคู่ขนานกับวิธีเดิม 1 งวดก่อนใช้จริง · รับประกัน 3 เดือน · โครงการเริ่มต้น 245,000 บาท
            </p>
          </div>

          <div ref={heroMockRef} className="mx-auto mt-14 max-w-5xl [perspective:1200px]">
            <ProductMock variant="inbox" />
            <p className="mt-3 text-center text-xs text-slate-500">
              หน้าแรกของฝ่ายบุคคล: พนักงาน 250 คน เหลือ 14 รายการที่ต้องตัดสินใจ ลองกดตัวกรองและติ๊กเลือกได้
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- DAILY WORK ---------------- */}
      <section id="daily" className="mx-auto max-w-7xl px-5 pt-20">
        <SectionHead
          eyebrow="งานประจำวันของฝ่ายบุคคล"
          title="สามขั้น แล้วจบ"
          sub="เราออกแบบจากงานที่ทำทุกวัน ไม่ใช่จากรายการฟีเจอร์ สิ่งที่ระบบหาเองได้ ระบบไม่ถามคุณ"
        />
        <ol className="stagger-group mt-10 grid gap-4 md:grid-cols-3">
          {DAILY_STEPS.map((d) => (
            <li key={d.step} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-base font-semibold text-white">{d.step}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{d.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- TOUR ---------------- */}
      <section id="tour" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ดูหน้าจอ"
          title="หน้าจอที่ฝ่ายบุคคลใช้ทุกวัน"
          sub="กดได้จริง ลองกรองรายการ ติ๊กเลือก หรือสลับกะในตาราง ตัวเลขเป็นข้อมูลตัวอย่าง หน้าจอจริงตั้งค่าตามกฎและข้อมูลของบริษัทคุณ"
        />

        <div className="reveal mt-10 flex flex-wrap justify-center gap-2" role="tablist" aria-label="หน้าจอ">
          {TOUR.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
                  tab === item.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
          <div className="reveal lg:pt-6">
            <h3 className="text-2xl font-semibold leading-snug text-slate-900">{activeTour.headline}</h3>
            <ul className="mt-5 space-y-3">
              {activeTour.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div ref={tourMockRef} className="lg:col-span-2">
            <ProductMock variant={tab} />
          </div>
        </div>
      </section>

      {/* ---------------- MARQUEE ---------------- */}
      <section className="overflow-hidden border-y border-slate-200 bg-emerald-50/40 py-4">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {['ติดตั้งในเครื่องของบริษัท', 'ส่งมอบซอร์สโค้ด', 'เชื่อมระบบการผลิต', 'เชื่อม ERP', 'กะหมุนเวียน', 'ค่าแรงเหมาชิ้น', 'ที่มาของทุกยอด', 'เดินคู่ขนานก่อนใช้จริง', 'ราคาเหมาจ่าย', 'ไทย / English'].map((w) => (
                <span key={w + dup} className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {w}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="stagger-group grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
              <div className="flex items-baseline gap-1 text-4xl font-bold text-slate-900">
                <span>{s.value.toLocaleString('th-TH')}</span>
                <span className="text-gradient text-2xl font-semibold">{s.suffix}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700">{s.label}</div>
              <div className="mt-1 text-xs text-slate-500">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- PAIN / FIX ---------------- */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="เราเหมาะกับใคร"
          title="ถ้าคุณเจอข้อใดข้อหนึ่งในนี้ เราควรคุยกัน"
          sub="ถ้าไม่เจอสักข้อ ระบบ HR แบบเช่าใช้รายเดือนน่าจะคุ้มกว่าสำหรับคุณ และเราจะบอกแบบนั้นตรง ๆ"
        />
        <div className="stagger-group mt-12 grid gap-4 md:grid-cols-2">
          {PAINS.map((p) => (
            <div
              key={p.pain}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs text-rose-500">
                  ✕
                </span>
                <p className="text-base font-medium text-slate-700">{p.pain}</p>
              </div>
              <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </span>
                <p className="text-sm leading-relaxed text-slate-500">{p.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- WHY DIFFERENT ---------------- */}
      <section id="why" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="สิ่งที่คุณได้จากการเป็นเจ้าของระบบ"
          title="ของคุณ ในเครื่องของคุณ เชื่อมกับระบบของคุณ"
          sub="สามเรื่องนี้มาจากรูปแบบการส่งมอบแบบโครงการ ไม่ใช่จากจำนวนฟีเจอร์"
        />
        <div className="stagger-group mt-12 grid gap-5 lg:grid-cols-3">
          {WEDGES.map((w) => {
            const Icon = ICONS[w.icon];
            return (
              <div key={w.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/60">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-200 to-teal-100">
                  <Icon className="h-5 w-5 text-emerald-800" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{w.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{w.body}</p>
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">{w.proof}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- VERSUS ---------------- */}
      <section id="versus" className="mx-auto max-w-5xl px-5 py-20">
        <SectionHead
          eyebrow="เทียบกับระบบเช่าใช้รายเดือน"
          title="ต่างกันที่รูปแบบ ไม่ใช่ที่จำนวนฟีเจอร์"
          sub="เราใส่ข้อที่ระบบเช่าใช้ดีกว่าไว้ด้วย เพื่อให้คุณตัดสินใจจากข้อมูลครบ"
        />
        <div className="reveal mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="hidden grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 md:grid">
            <span>เรื่อง</span>
            <span>ระบบเช่าใช้รายเดือน</span>
            <span className="text-emerald-800">GoAlong HR</span>
          </div>
          {COMPARE.map((row) => (
            <div key={row.topic} className="grid gap-x-4 gap-y-1 border-b border-slate-100 px-6 py-4 last:border-b-0 md:grid-cols-3">
              <span className="text-sm font-medium text-slate-900">{row.topic}</span>
              <span className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                {row.better === 'theirs'
                  ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-label="ข้อได้เปรียบ" />
                  : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                <span><span className="md:hidden">ระบบเช่าใช้: </span>{row.theirs}</span>
              </span>
              <span className={`flex items-start gap-2 text-sm leading-relaxed ${row.better === 'ours' ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                {row.better === 'ours'
                  ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-label="ข้อได้เปรียบ" />
                  : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                <span><span className="md:hidden">GoAlong HR: </span>{row.ours}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="reveal mt-4 text-center text-xs leading-relaxed text-slate-500">
          เปรียบเทียบตามรูปแบบการให้บริการโดยทั่วไป ผู้ให้บริการแต่ละรายต่างกัน กรุณาสอบถามรายที่คุณกำลังพิจารณา
          ถ้าระบบเช่าใช้ตอบโจทย์คุณได้ ควรใช้ระบบนั้น
        </p>
      </section>

      {/* ---------------- MODULES ---------------- */}
      <section id="modules" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ขอบเขตของระบบ"
          title="เวลาทำงานถึงเงินเดือน ในฐานข้อมูลชุดเดียว"
          sub="รายการที่มีป้าย ส่งมอบในโครงการ ทีมงานพัฒนาและทดสอบกับข้อมูลของบริษัทคุณก่อนส่งมอบ เราไม่ทำระบบสรรหา ประเมินผล หรืออบรม"
        />
        <div className="stagger-group mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon];
            return (
              <div
                key={m.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300"
              >
                <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r ${m.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent}`}>
                  <Icon className="h-5 w-5 text-emerald-800" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{m.desc}</p>
                <span
                  className={`mt-4 inline-block rounded-full px-2.5 py-1 text-[11px] ${
                    m.status === 'พร้อมใช้' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- FLOW ---------------- */}
      <section id="flow" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ขั้นตอนของโครงการ"
          title="ห้าขั้นตอน จากตรวจนับกฎถึงใช้งานจริง"
        />
        <ol className="stagger-group mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FLOW.map((f) => (
            <li
              key={f.step}
              className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-emerald-50/60 p-6"
            >
              <span className="text-4xl font-bold text-emerald-300" aria-hidden="true">{f.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- WHY US ---------------- */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="reveal overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                ซื้อระบบ HR แล้วกลัวอะไร <span className="text-gradient">เราตอบตรงนั้น</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                ลูกค้า SME ส่วนใหญ่ไม่ได้กลัวว่าฟีเจอร์ไม่พอ แต่กลัวส่งงานไม่ตรงเวลา ราคาบานปลาย
                และกลัวว่าคนทำหายไปหลังติดตั้งเสร็จ สามข้อนี้เราเขียนไว้ในสัญญา
              </p>
            </div>
            <div className="stagger-group grid gap-3">
              {[
                { icon: Zap, t: 'ราคาแบบเหมาจ่าย', d: 'ตกลงขอบเขตชัดก่อนเริ่ม งานนอกขอบเขตออกเป็นใบ Change Request ให้อนุมัติก่อนทำเสมอ' },
                { icon: LineChart, t: 'เห็นความคืบหน้าทุกสัปดาห์', d: 'เดโมของจริงทุก sprint และรายงานสถานะทุกวันศุกร์ ไม่มีเงียบหาย' },
                { icon: ShieldCheck, t: 'ดูแลต่อหลังส่งมอบ', d: 'รับประกันแก้บั๊กฟรี 3 เดือน ต่อด้วยสัญญา MA รายเดือนพร้อม SLA เป็นลายลักษณ์อักษร' },
              ].map((v) => (
                <div key={v.t} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                  <v.icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <div className="font-medium text-slate-900">{v.t}</div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{v.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ราคาแบบขั้นบันได"
          title="ระบบมาตรฐานเป็นฐาน บวกสิ่งที่บริษัทคุณต้องใช้จริง"
          sub="ทุกบรรทัดในใบเสนอราคาบอกได้ว่าจ่ายเพื่ออะไร ถ้าคุณต้องการเพียงระบบมาตรฐาน ระบบเช่าใช้รายเดือนคุ้มกว่า"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {/* core package */}
          <div className="reveal rounded-2xl border border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-7 shadow-sm shadow-emerald-200/70 lg:col-span-2">
            <div className="text-sm text-emerald-700">ระบบมาตรฐาน (ฐานของทุกโครงการ ไม่ขายแยก)</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold text-slate-900">{CORE.price}</span>
              <span className="pb-1.5 text-xs text-slate-400">{CORE.unit}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{CORE.desc}</p>
            <ul className="mt-6 space-y-3">
              {CORE.includes.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* rule packs */}
          <div className="reveal rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/60 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Plus className="h-4 w-4 text-emerald-600" /> บวกการติดตั้ง การเชื่อมต่อ และชุดกฎที่ต้องใช้
            </div>
            <div className="mt-5 space-y-5">
              {['ติดตั้งและเชื่อมต่อ', 'กฎเวลาและค่าจ้าง', 'โครงสร้างองค์กร'].map((group) => (
                <div key={group}>
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">{group}</div>
                  <div className="mt-2 divide-y divide-slate-100">
                    {RULE_PACKS.filter((r) => r.group === group).map((r) => (
                      <div key={r.name} className="flex items-baseline justify-between gap-4 py-2">
                        <span className="text-sm text-slate-600">{r.name}</span>
                        <span className="shrink-0 text-sm font-medium text-slate-900">+{r.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              ราคาชุดกฎคิดจากชั่วโมงงานจริงในการวิเคราะห์ระเบียบ เขียนสูตร และทดสอบย้อนหลังกับข้อมูลของคุณ
              ค่าดูแลรายเดือนคิดประมาณ 3% ของมูลค่าโครงการ ขั้นต่ำ 5,000 บาท
            </p>
          </div>
        </div>

        {/* worked examples */}
        <div className="stagger-group mt-6 grid gap-4 lg:grid-cols-3">
          {EXAMPLE_BUILDS.map((b) => (
            <div
              key={b.profile}
              className={`rounded-2xl border p-6 transition-transform duration-300 hover:-translate-y-1 ${
                b.highlight
                  ? 'border-emerald-300 bg-emerald-50/60 shadow-sm shadow-emerald-200/70'
                  : 'border-slate-200 bg-white shadow-sm shadow-slate-200/60'
              }`}
            >
              <div className="text-sm font-medium text-slate-900">{b.profile}</div>
              <ul className="mt-3 space-y-1.5">
                {b.items.map((it) => (
                  <li key={it} className="text-xs text-slate-500">· {it}</li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{b.total}</div>
                  <div className="text-[11px] text-slate-400">บาท ครั้งเดียว</div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  ค่าดูแล<br />{b.ma}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="reveal mt-6 text-center text-xs text-slate-400">
          ราคาไม่รวมภาษีมูลค่าเพิ่ม · ราคาสุดท้ายยืนยันหลังดูระเบียบการทำงานและไฟล์เวลาจริงของบริษัทคุณ ·
          งานนอกขอบเขตออกเป็นใบ Change Request ให้อนุมัติก่อนทำเสมอ
        </p>

        {/* risk reversal */}
        <div className="reveal mt-10 flex flex-col items-center gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-7 text-center sm:flex-row sm:text-left">
          <ShieldQuestion className="h-10 w-10 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <div className="text-lg font-semibold text-slate-900">เดินคู่ขนานก่อนใช้จริง</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              ก่อนตัดใช้จริง เราคำนวณคู่กับวิธีเดิมของคุณ 1 งวด แล้วส่งรายงานส่วนต่างรายคนพร้อมสาเหตุและหลักฐานจากเวลาสแกน
              คุณยืนยันผลก่อน ระบบจึงเริ่มใช้จริง
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
          >
            นัดคุยกับเรา <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="mx-auto max-w-4xl px-5 py-20">
        <SectionHead eyebrow="คำถามที่พบบ่อย" title="เรื่องที่ลูกค้าถามก่อนตัดสินใจ" />
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} item={f} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section id="contact" className="mx-auto max-w-7xl px-5 py-20">
        <div className="reveal relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-100 via-white to-teal-100 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-200/60 blur-[100px]" />
          <div className="relative">
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              เล่าให้เราฟังว่าระบบปัจจุบันติดตรงไหน
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
              ข้อกำหนดเรื่องที่เก็บข้อมูล ระบบที่ต้องเชื่อม หรือกฎที่ตั้งไม่ได้ บอกเราเป็นข้อ ๆ
              เราจะตอบตรง ๆ ว่าทำได้หรือไม่ ใช้เวลาเท่าไร และถ้าระบบเช่าใช้เหมาะกับคุณกว่า เราจะบอกแบบนั้น
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-medium text-slate-900 shadow-lg shadow-emerald-600/20 transition-transform hover:scale-105 sm:w-auto"
              >
                ลงทะเบียนรับการติดต่อกลับ <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm shadow-slate-200/60 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900">ข้อมูลติดต่อ</h3>
              <p className="mt-1 text-sm text-slate-600">{COMPANY.name}</p>
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {CONTACT_CHANNELS.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel.icon];
                  return (
                    <div key={channel.key} className={`flex items-start gap-3 ${channel.key === 'address' ? 'sm:col-span-2' : ''}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{channel.label}</dt>
                        <dd className="break-words text-sm font-medium text-slate-900">
                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="inline-flex min-h-[28px] items-center underline decoration-slate-300 underline-offset-4 hover:text-emerald-700 hover:decoration-emerald-600"
                              {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            >
                              {channel.value}
                            </a>
                          ) : (
                            channel.value
                          )}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
                ตอบกลับภายใน 2 ชั่วโมงทำการ (จันทร์ถึงศุกร์ 09:00-18:00)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <BrandLogo />
            <p className="mt-2 text-sm font-medium text-slate-700">{COMPANY.byline}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{SITE_TAGLINE}</p>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">ข้อมูลติดต่อ</h2>
            <p className="mt-1 text-sm text-slate-600">{COMPANY.name}</p>
            <ul className="mt-3 space-y-2">
              {CONTACT_CHANNELS.map((channel) => {
                const Icon = CHANNEL_ICONS[channel.icon];
                return (
                  <li key={channel.key} className="flex items-start gap-2 text-sm text-slate-600">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      <span className="text-slate-500">{channel.label}: </span>
                      {channel.href ? (
                        <a
                          href={channel.href}
                          className="font-medium text-slate-800 hover:text-emerald-700"
                          {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {channel.value}
                        </a>
                      ) : (
                        <span className="text-slate-800">{channel.value}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav aria-label="ลิงก์ท้ายหน้า">
            <h2 className="text-sm font-semibold text-slate-900">เมนู</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#tour" className="text-slate-600 hover:text-slate-900">ดูหน้าจอ</a></li>
              <li><a href="#pricing" className="text-slate-600 hover:text-slate-900">ราคา</a></li>
              <li><a href="/blog/" className="text-slate-600 hover:text-slate-900">บทความ</a></li>
              <li><Link to="/register" className="text-slate-600 hover:text-slate-900">ลงทะเบียน</Link></li>
              <li><Link to="/login" className="text-slate-600 hover:text-slate-900">เข้าสู่ระบบ</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-100 px-5 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} {SITE_NAME} {COMPANY.byline}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
