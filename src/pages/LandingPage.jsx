import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight, Check, ChevronDown, Users, Clock, Timer, CalendarDays, Wallet,
  FileBarChart, Building2, ShieldCheck, Sparkles, Phone, Mail, LineChart, Zap,
  Sliders, TrendingDown, Server, Plus, ShieldQuestion,
} from 'lucide-react';
import ProductMock from '@/components/landing/ProductMock';
import {
  STATS, WEDGES, COST_COMPARE, PAINS, MODULES, FLOW, CORE, RULE_PACKS, EXAMPLE_BUILDS, FAQS,
} from '@/components/landing/data';

gsap.registerPlugin(ScrollTrigger);

/** Icon lookup so module data can stay serialisable. */
const ICONS = { Users, Clock, Timer, CalendarDays, Wallet, FileBarChart, Building2, ShieldCheck, Sliders, TrendingDown, Server };

/** Anchor targets used by the sticky nav. */
const NAV_LINKS = [
  { href: '#why', label: 'ต่างยังไง' },
  { href: '#compare', label: 'เทียบค่าใช้จ่าย' },
  { href: '#modules', label: 'ฟีเจอร์' },
  { href: '#tour', label: 'ตัวอย่างหน้าจอ' },
  { href: '#pricing', label: 'ราคา' },
  { href: '#faq', label: 'คำถามที่พบบ่อย' },
];

/**
 * Splits a string into per-word spans so GSAP can stagger them without the SplitText plugin.
 * @param {string} text - Text to split.
 * @param {string} [className] - Extra classes applied to every word span.
 * @returns {JSX.Element[]} Word elements ready to animate.
 */
const splitWords = (text, className = '') =>
  text.split(' ').map((word, i) => (
    <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
      <span className={`hero-word inline-block ${className}`}>{word}&nbsp;</span>
    </span>
  ));

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
  const [tab, setTab] = useState('dashboard');
  const [openFaq, setOpenFaq] = useState(0);
  const [calcIdx, setCalcIdx] = useState(1);
  const saasRef = useRef(null);
  const oursRef = useRef(null);
  const saveRef = useRef(null);

  const calc = COST_COMPARE.options[calcIdx];
  /** Three-year cost of a per-head SaaS at the assumed market rate. */
  const saas3y = calc.headcount * COST_COMPARE.saasPerHead * 36;
  /** Three-year cost of owning the system: one-off project plus monthly care. */
  const ours3y = calc.project + calc.ma * 36;

  useLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const mm = gsap.matchMedia();

      /* Reduced motion: show everything, skip movement. */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.hero-word, .reveal, .hero-fade', { opacity: 1, y: 0, clearProps: 'all' });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ---- hero entrance ---- */
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
          .from('.hero-word', { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.045 }, '-=0.3')
          .from('.hero-fade', { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.5')
          .from(heroMockRef.current, { y: 60, opacity: 0, rotateX: 18, duration: 1.1 }, '-=0.6')
          .from('.hero-orb', { scale: 0.4, opacity: 0, duration: 1.4, stagger: 0.15 }, 0);

        /* ---- hero mock parallax ---- */
        gsap.to(heroMockRef.current, {
          yPercent: 12,
          scale: 0.94,
          opacity: 0.65,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'bottom 85%', end: 'bottom top', scrub: true },
        });

        /* ---- generic reveal ---- */
        gsap.utils.toArray('.reveal').forEach((el) => {
          gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
          });
        });

        /* ---- staggered card grids ---- */
        gsap.utils.toArray('.stagger-group').forEach((group) => {
          gsap.from(group.children, {
            y: 48,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: group, start: 'top 85%' },
          });
        });

        /* ---- animated counters ---- */
        gsap.utils.toArray('.counter').forEach((el) => {
          const target = Number(el.dataset.value);
          const proxy = { v: 0 };
          gsap.to(proxy, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 90%' },
            onUpdate: () => {
              el.textContent = target % 1 === 0 ? Math.round(proxy.v).toLocaleString('th-TH') : proxy.v.toFixed(1);
            },
          });
        });

        /* ---- looping keyword marquee ---- */
        gsap.to('.marquee-track', { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });

        /* ---- mock chart bars grow on view ---- */
        gsap.from('.mock-bar', {
          scaleY: 0,
          transformOrigin: 'bottom center',
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.05,
          scrollTrigger: { trigger: '.hero', start: 'top 70%' },
        });
      });

      /* ---- pinned horizontal flow (desktop only) ---- */
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const track = self.selector('.flow-track')[0];
        const wrap = self.selector('.flow-wrap')[0];
        if (!track || !wrap) return;
        const distance = () => track.scrollWidth - wrap.offsetWidth;
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      });

      /* ---- sticky nav background ---- */
      ScrollTrigger.create({
        start: 'top -80',
        onUpdate: (st) => {
          const nav = self.selector('.site-nav')[0];
          if (nav) nav.classList.toggle('is-scrolled', st.scroll() > 80);
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  /** Counts the cost-comparison figures up whenever the headcount option changes. */
  useLayoutEffect(() => {
    const targets = [
      [saasRef.current, saas3y],
      [oursRef.current, ours3y],
      [saveRef.current, saas3y - ours3y],
    ];
    const tweens = targets.map(([el, value]) => {
      if (!el) return null;
      const proxy = { v: 0 };
      return gsap.to(proxy, {
        v: value,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(proxy.v).toLocaleString('th-TH');
        },
      });
    });
    return () => tweens.forEach((t) => t && t.kill());
  }, [saas3y, ours3y]);

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
        <title>ระบบบริหารงานบุคคล HRM สำหรับธุรกิจไทย | เวลาทำงาน OT การลา เงินเดือน</title>
        <meta
          name="description"
          content="ระบบ HRM ครบวงจรสำหรับ SME ไทย จัดการทะเบียนพนักงาน เวลาเข้า-ออก กะทำงาน OT การลา และเงินเดือน คำนวณตามกฎหมายแรงงานไทย ใช้งานภาษาไทยและอังกฤษ"
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
          .text-gradient { background: linear-gradient(120deg,#34d399,#10b981 45%,#5eead4); -webkit-background-clip: text; background-clip: text; color: transparent; }
        `}</style>
      </Helmet>

      {/* ---------------- NAV ---------------- */}
      <header className="site-nav fixed inset-x-0 top-0 z-50 border-b border-transparent">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-300 font-bold text-white">
              H
            </span>
            <span className="text-lg font-semibold text-slate-900">HRM<span className="text-emerald-600">.</span>Suite</span>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:+66866083298"
              className="hidden items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 md:flex"
            >
              <Phone className="h-4 w-4" /> 086-608-3298
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
              สำหรับโรงงานและธุรกิจหลายกะ ตั้งแต่ 100 คนขึ้นไป
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              {splitWords('กฎกะและ OT ของคุณซับซ้อนแค่ไหน')}
              <br className="hidden sm:block" />
              {splitWords('ระบบก็คิดตามนั้น', 'text-gradient')}
            </h1>

            <p className="hero-fade mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
              ระบบ HRM ที่สร้างสูตรเวลาและค่าจ้างตามระเบียบบริษัทคุณจริง ๆ ไม่ใช่ให้คุณแก้ระเบียบตามระบบ
              กะหมุนข้ามคืน ค่ากะแยกช่วงเวลา เบี้ยขยันมีเงื่อนไข รายวันปนเหมาชิ้น — คิดได้หมด
              จ่ายเป็นโครงการครั้งเดียว ไม่คิดรายหัวต่อเดือน
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
                ดูตัวอย่างหน้าจอ
              </a>
            </div>

            <p className="hero-fade mt-4 text-xs text-slate-400">
              คำนวณเงินเดือนจากไฟล์จริงของคุณให้ดูใน 3 วัน · ตัวเลขไม่ตรง ไม่คิดเงิน · เริ่มต้น 120,000 บาท
            </p>
          </div>

          <div ref={heroMockRef} className="mx-auto mt-14 max-w-5xl [perspective:1200px]">
            <ProductMock variant="dashboard" />
          </div>
        </div>
      </section>

      {/* ---------------- MARQUEE ---------------- */}
      <section className="overflow-hidden border-y border-slate-200 bg-emerald-50/40 py-4">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {['ทะเบียนพนักงาน', 'กะทำงาน', 'OT 1.5x / 3x', 'โควตาวันลา', 'ประกันสังคม', 'ภ.ง.ด.1', 'สลิปเงินเดือน PDF', 'รายงาน Excel', 'Audit Log', 'ไทย / English'].map((w) => (
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
                <span className="counter" data-value={s.value}>0</span>
                <span className="text-gradient text-2xl font-semibold">{s.suffix}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700">{s.label}</div>
              <div className="mt-1 text-xs text-slate-400">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- PAIN / FIX ---------------- */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ปัญหาที่เจอทุกเดือน"
          title="ถ้ายังทำ HR ด้วย Excel ต้นทุนที่มองไม่เห็นสูงกว่าที่คิด"
          sub="ทุกชั่วโมงที่ HR ใช้กระทบยอดเวลาเข้า-ออก คือชั่วโมงที่หายไปจากงานดูแลคน และทุกความผิดพลาดเรื่องเงินคือความไว้ใจที่หายไป"
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
          eyebrow="จุดที่ระบบสำเร็จรูปไปต่อไม่ได้"
          title="ถ้ากฎบริษัทคุณเข้าช่องของระบบสำเร็จรูปได้ ใช้ของเขาคุ้มกว่า"
          sub="เราพูดตรง ๆ แบบนั้น เพราะเรามีที่ยืนเฉพาะตอนที่กฎของคุณไม่เข้าช่อง และสามเรื่องข้างล่างคือจุดที่ลูกค้าเปลี่ยนมาหาเราจริง"
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

      {/* ---------------- COST COMPARISON ---------------- */}
      <section id="compare" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="เทียบค่าใช้จ่าย 3 ปี"
          title="ระบบคิดรายหัว ถูกกว่าตอนเริ่ม แพงกว่าตอนบริษัทโต"
          sub="เลือกขนาดองค์กรของคุณเพื่อดูค่าใช้จ่ายรวม 3 ปี เทียบระหว่างระบบที่คิดรายหัวรายเดือน กับการเป็นเจ้าของระบบเอง"
        />

        <div className="reveal mt-10 flex flex-wrap justify-center gap-2">
          {COST_COMPARE.options.map((o, i) => (
            <button
              key={o.headcount}
              type="button"
              onClick={() => setCalcIdx(i)}
              className={`rounded-xl border px-5 py-2.5 text-sm transition-all ${
                calcIdx === i
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.headcount} คน
            </button>
          ))}
        </div>

        <div className="reveal mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/60">
            <div className="text-sm text-slate-500">ระบบคิดรายหัว</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span ref={saasRef} className="text-4xl font-bold text-slate-900">0</span>
              <span className="text-sm text-slate-400">บาท / 3 ปี</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              คิดที่ {COST_COMPARE.saasPerHead} บาท/คน/เดือน × {calc.headcount} คน × 36 เดือน และจ่ายต่อไปเรื่อย ๆ ไม่มีวันจบ
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-7 shadow-sm shadow-emerald-200/70">
            <div className="text-sm text-emerald-700">เป็นเจ้าของระบบเอง</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span ref={oursRef} className="text-4xl font-bold text-slate-900">0</span>
              <span className="text-sm text-slate-400">บาท / 3 ปี</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              โครงการ {calc.project.toLocaleString('th-TH')} บาท ครั้งเดียว + ค่าดูแล {calc.ma.toLocaleString('th-TH')} บาท/เดือน · {calc.note}
            </p>
          </div>
        </div>

        <div className="reveal mx-auto mt-4 max-w-4xl rounded-2xl border border-slate-200 bg-white px-7 py-5 text-center shadow-sm shadow-slate-200/60">
          {saas3y - ours3y > 0 ? (
            <p className="text-sm text-slate-600">
              ที่ {calc.headcount} คน ประหยัดได้ประมาณ{' '}
              <span ref={saveRef} className="text-lg font-semibold text-emerald-600">0</span> บาท ใน 3 ปี
              และส่วนต่างจะกว้างขึ้นทุกปีที่พนักงานเพิ่ม
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              ที่ {calc.headcount} คน ระบบรายหัวยังถูกกว่าประมาณ{' '}
              <span ref={saveRef} className="text-lg font-semibold text-slate-700">0</span> บาท ใน 3 ปี —
              ถ้ากฎเวลาและค่าจ้างของคุณไม่ซับซ้อน เราจะแนะนำให้ใช้ระบบสำเร็จรูปตรง ๆ
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            ตัวเลขฝั่งระบบรายหัวเป็นค่ากลางของตลาดที่ {COST_COMPARE.saasPerHead} บาท/คน/เดือน ใช้ราคาจริงของผู้ให้บริการที่คุณกำลังเทียบแทนได้
          </p>
        </div>
      </section>

      {/* ---------------- MODULES ---------------- */}
      <section id="modules" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="8 โมดูลในระบบเดียว"
          title="ครบตั้งแต่วันแรกที่พนักงานเข้า จนถึงสลิปใบสุดท้าย"
          sub="ทุกโมดูลใช้ฐานข้อมูลพนักงานชุดเดียวกัน แก้ที่เดียว อัปเดตทั้งระบบ"
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
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- FLOW (pinned horizontal) ---------------- */}
      <section id="flow" className="flow-wrap relative overflow-hidden py-20 lg:h-screen lg:py-0">
        <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-5">
          <SectionHead
            center={false}
            eyebrow="ขั้นตอนใช้งานจริง"
            title="ห้าขั้นตอน จากเวลาเข้างานถึงเงินเข้าบัญชี"
          />
          <div className="flow-track mt-10 flex gap-5 overflow-x-auto pb-4 lg:overflow-visible lg:pb-0">
            {FLOW.map((f, i) => (
              <div
                key={f.step}
                className="relative w-[78vw] shrink-0 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-emerald-50/60 p-7 sm:w-[420px] lg:w-[380px]"
              >
                <span className="text-5xl font-bold text-emerald-200">{f.step}</span>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                {i < FLOW.length - 1 && (
                  <ArrowRight className="absolute right-5 top-7 h-5 w-5 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- TOUR ---------------- */}
      <section id="tour" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead
          eyebrow="ตัวอย่างหน้าจอ"
          title="หน้าตาระบบที่ HR ใช้ทุกวัน"
          sub="ออกแบบให้คนที่ไม่ใช่สาย IT ใช้ได้เอง เมนูภาษาไทย ตัวเลขอ่านง่าย และมองเห็นสิ่งที่ต้องทำวันนี้ตั้งแต่หน้าแรก"
        />

        <div className="reveal mt-10 flex flex-wrap justify-center gap-2">
          {[
            { id: 'dashboard', label: 'แดชบอร์ดผู้บริหาร', icon: LineChart },
            { id: 'attendance', label: 'เวลาเข้า-ออก & OT', icon: Clock },
            { id: 'payroll', label: 'รอบเงินเดือน', icon: Wallet },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
                tab === t.id
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div ref={tourMockRef} className="mx-auto mt-8 max-w-5xl">
          <ProductMock variant={tab} />
        </div>
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
          title="เริ่มที่ระบบมาตรฐาน แล้วจ่ายเพิ่มเฉพาะกฎที่คุณใช้จริง"
          sub="ไม่มีแพ็กเกจที่บังคับซื้อของที่ไม่ได้ใช้ ทุกบรรทัดในใบเสนอราคาบอกได้ว่าจ่ายเพื่ออะไร"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {/* core package */}
          <div className="reveal rounded-2xl border border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-7 shadow-sm shadow-emerald-200/70 lg:col-span-2">
            <div className="text-sm text-emerald-700">ระบบมาตรฐาน (ทุกโครงการเริ่มจากตรงนี้)</div>
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
              <Plus className="h-4 w-4 text-emerald-600" /> บวกเฉพาะชุดกฎและการเชื่อมต่อที่ต้องใช้
            </div>
            <div className="mt-5 space-y-5">
              {['กฎเวลาและค่าจ้าง', 'การเชื่อมต่อ', 'โครงสร้างองค์กร'].map((group) => (
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
            <div className="text-lg font-semibold text-slate-900">พิสูจน์ก่อนจ่าย</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              ส่งไฟล์เวลาเข้า-ออก 1 เดือนและระเบียบการทำงานมาให้เรา ทีมงานจะตั้งกฎของคุณลงระบบและคำนวณเงินเดือนให้ดูของจริงใน 3 วันทำการ
              ถ้าตัวเลขไม่ตรงกับที่ HR คำนวณเอง เราไม่คิดค่าใช้จ่ายในขั้นนี้
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
          >
            ส่งไฟล์ให้เราคำนวณ <ArrowRight className="h-4 w-4" />
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
              ให้เราพิสูจน์ด้วยข้อมูลจริงของคุณก่อน
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
              ส่งไฟล์เวลาเข้า-ออก 1 เดือน พร้อมระเบียบการทำงานเรื่องกะ OT และเบี้ยต่าง ๆ มาให้เรา
              ทีมงานจะตั้งกฎของคุณลงระบบและคำนวณเงินเดือนให้ดูของจริงภายใน 3 วันทำการ ไม่มีค่าใช้จ่ายและไม่ผูกมัด
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-medium text-slate-900 shadow-lg shadow-emerald-600/20 transition-transform hover:scale-105 sm:w-auto"
              >
                ลงทะเบียนรับการติดต่อกลับ <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+66866083298"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
              >
                <Phone className="h-4 w-4" /> 086-608-3298
              </a>
              <a
                href="mailto:amnart.gl@gmail.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
              >
                <Mail className="h-4 w-4" /> amnart.gl@gmail.com
              </a>
            </div>
            <p className="mt-5 text-xs text-slate-400">
              โทร 086-608-3298 · อีเมล amnart.gl@gmail.com · ตอบกลับภายใน 2 ชั่วโมงทำการ (จ-ศ 09:00-18:00)
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <span className="text-sm text-slate-400">© {new Date().getFullYear()} HRM Suite · ระบบบริหารงานบุคคลสำหรับธุรกิจไทย</span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <a href="tel:+66866083298" className="flex items-center gap-1.5 hover:text-emerald-700">
              <Phone className="h-3.5 w-3.5" /> 086-608-3298
            </a>
            <a href="mailto:amnart.gl@gmail.com" className="flex items-center gap-1.5 hover:text-emerald-700">
              <Mail className="h-3.5 w-3.5" /> amnart.gl@gmail.com
            </a>
            <a href="#pricing" className="hover:text-slate-600">ราคา</a>
            <Link to="/login" className="hover:text-slate-600">เข้าสู่ระบบ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
