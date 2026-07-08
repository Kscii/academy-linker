// ============================================================
// LandingPage — Academy Linker public research/product overview
// Standalone component (no AppShell). Forces day-mode colors.
// Academic/research aesthetic — DM Serif Display + Nunito
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogoMark } from '@/components/LogoMark';

// ── Design tokens (day mode, hardcoded) ───────────────────────
const T = {
  bg:     '#FFF4E6',
  surf:   '#FFFBF5',
  surf2:  '#FFE8D0',
  pri:    '#E8614E',
  teal:   '#3DB6A8',
  amber:  '#F0A732',
  blue:   '#4A90D9',
  tx:     '#2A3560',
  tx2:    '#7A6A8C',
  tx3:    '#B8A8C8',
  bd:     'rgba(232,97,78,0.18)',
  serif:  "'DM Serif Display', serif",
  body:   "'Nunito', sans-serif",
} as const;

// ── Global keyframes injected once ────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Nunito:wght@400;500;600;700;800&display=swap');

  @keyframes hero-gradient-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.7; }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes counter-tick {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes underline-grow {
    from { width: 0; }
    to   { width: 100%; }
  }
  .al-fade-up {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }
  .al-fade-up.al-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .al-fade-left {
    opacity: 0;
    transform: translateX(-28px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }
  .al-fade-left.al-visible {
    opacity: 1;
    transform: translateX(0);
  }
  .al-fade-right {
    opacity: 0;
    transform: translateX(28px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }
  .al-fade-right.al-visible {
    opacity: 1;
    transform: translateX(0);
  }
  .al-stagger-1 { transition-delay: 0.05s; }
  .al-stagger-2 { transition-delay: 0.15s; }
  .al-stagger-3 { transition-delay: 0.25s; }
  .al-stagger-4 { transition-delay: 0.35s; }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
`;

// ── IntersectionObserver scroll-fade hook ─────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.al-fade-up, .al-fade-left, .al-fade-right');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('al-visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Animated counter hook ─────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = false): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return val;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

// ── Logo (icon + wordmark) ────────────────────────────────────
function LogoCombo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LogoMark size={size} />
      <span style={{
        fontFamily: T.serif,
        fontSize: size * 0.64,
        color: light ? T.bg : T.tx,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}>
        Academy Linker
      </span>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────
function Section({
  id,
  bg,
  children,
  style,
}: {
  id?: string;
  bg?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      style={{
        background: bg ?? T.bg,
        width: '100%',
        padding: '80px 0',
        ...style,
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
        {children}
      </div>
    </section>
  );
}

// ── Section label (small caps eyebrow) ───────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: T.body,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: T.pri,
      marginBottom: 12,
    }}>
      {children}
    </p>
  );
}

// ── Section title ─────────────────────────────────────────────
function SectionTitle({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2 style={{
      fontFamily: T.serif,
      fontSize: 38,
      fontWeight: 400,
      color: T.tx,
      marginBottom: 16,
      lineHeight: 1.22,
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </h2>
  );
}

// ── Body paragraph ────────────────────────────────────────────
function BodyP({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: T.body,
      fontSize: 16,
      lineHeight: 1.85,
      color: T.tx2,
      marginBottom: 20,
      ...style,
    }}>
      {children}
    </p>
  );
}

// ── Insight card (formerly CitationCard) ──────────────────────
function CitationCard({
  quote,
  citation,
  delay,
}: {
  quote: string;
  citation: string;
  delay?: string;
}) {
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      style={{
        background: T.surf,
        border: `1px solid ${T.bd}`,
        borderLeft: `4px solid ${T.pri}`,
        borderRadius: 10,
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <p style={{
        fontFamily: T.body,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: T.pri,
        margin: 0,
      }}>
        {citation}
      </p>
      <p style={{
        fontFamily: T.body,
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1.7,
        color: T.tx,
        margin: 0,
      }}>
        {quote}
      </p>
    </div>
  );
}

// ── Feature block (alternating layout) ───────────────────────
function FeatureBlock({
  icon,
  title,
  description,
  flip,
  accentColor,
}: {
  icon: string;
  title: string;
  description: string;
  flip?: boolean;
  accentColor?: string;
}) {
  const accent = accentColor ?? T.pri;
  const fadeClass = flip ? 'al-fade-right' : 'al-fade-left';
  return (
    <div
      className={`${fadeClass}`}
      style={{
        display: 'flex',
        flexDirection: flip ? 'row-reverse' : 'row',
        gap: 52,
        alignItems: 'flex-start',
        padding: '40px 0',
        borderBottom: `1px solid ${T.bd}`,
      }}
    >
      {/* Icon column */}
      <div style={{
        flexShrink: 0,
        width: 64,
        height: 64,
        borderRadius: 16,
        background: `${accent}18`,
        border: `1.5px solid ${accent}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
      }}>
        {icon}
      </div>
      {/* Text column */}
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontFamily: T.serif,
          fontSize: 22,
          fontWeight: 400,
          color: T.tx,
          marginBottom: 10,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: T.body,
          fontSize: 15,
          lineHeight: 1.75,
          color: T.tx2,
          margin: 0,
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Portal card ───────────────────────────────────────────────
function PortalCard({
  title,
  subtitle,
  items,
  accentColor,
  delay,
}: {
  title: string;
  subtitle: string;
  items: string[];
  accentColor: string;
  delay?: string;
}) {
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      style={{
        flex: 1,
        minWidth: 260,
        background: T.surf,
        border: `1.5px solid ${accentColor}30`,
        borderTop: `4px solid ${accentColor}`,
        borderRadius: 12,
        padding: '30px 28px',
      }}
    >
      <h3 style={{
        fontFamily: T.serif,
        fontSize: 22,
        fontWeight: 400,
        color: T.tx,
        marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: T.body,
        fontSize: 13.5,
        color: T.tx2,
        lineHeight: 1.6,
        marginBottom: 20,
      }}>
        {subtitle}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 10,
            fontFamily: T.body,
            fontSize: 14,
            color: T.tx2,
            lineHeight: 1.55,
          }}>
            <span style={{ color: accentColor, flexShrink: 0, marginTop: 2, fontSize: 13 }}>▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Principle card ────────────────────────────────────────────
function PrincipleCard({
  number,
  title,
  body,
  delay,
}: {
  number: string;
  title: string;
  body: string;
  delay?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.surf2 : T.surf,
        border: `1px solid ${hovered ? T.pri + '40' : T.bd}`,
        borderRadius: 12,
        padding: '30px 28px',
        cursor: 'default',
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        boxShadow: hovered ? '0 4px 20px rgba(232,97,78,0.1)' : 'none',
      }}
    >
      <div style={{
        fontFamily: T.serif,
        fontSize: 42,
        color: hovered ? `${T.pri}60` : `${T.pri}28`,
        lineHeight: 1,
        marginBottom: 12,
        fontWeight: 400,
        transition: 'color 0.25s ease',
      }}>
        {number}
      </div>
      <h3 style={{
        fontFamily: T.serif,
        fontSize: 20,
        fontWeight: 400,
        color: T.tx,
        marginBottom: hovered ? 10 : 0,
        transition: 'margin-bottom 0.3s ease',
      }}>
        {title}
      </h3>
      <div style={{
        overflow: 'hidden',
        maxHeight: hovered ? '300px' : '0',
        opacity: hovered ? 1 : 0,
        transition: 'max-height 0.4s ease, opacity 0.3s ease',
      }}>
        <p style={{
          fontFamily: T.body,
          fontSize: 14.5,
          lineHeight: 1.8,
          color: T.tx2,
          margin: 0,
        }}>
          {body}
        </p>
      </div>
    </div>
  );
}

// ── CurricuLLM use-case card ──────────────────────────────────
function CurricuCard({
  icon,
  title,
  body,
  delay,
}: {
  icon: string;
  title: string;
  body: string;
  delay?: string;
}) {
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      style={{
        background: T.surf,
        border: `1px solid ${T.teal}30`,
        borderTop: `3px solid ${T.teal}`,
        borderRadius: 12,
        padding: '26px 24px',
        flex: 1,
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <h4 style={{
        fontFamily: T.serif,
        fontSize: 18,
        fontWeight: 400,
        color: T.tx,
        marginBottom: 10,
      }}>
        {title}
      </h4>
      <p style={{
        fontFamily: T.body,
        fontSize: 14,
        lineHeight: 1.75,
        color: T.tx2,
        margin: 0,
      }}>
        {body}
      </p>
    </div>
  );
}

// ── Impact statement card ─────────────────────────────────────
function ImpactCard({
  stat,
  label,
  body,
  accentColor,
  delay,
}: {
  stat: string;
  label: string;
  body: string;
  accentColor: string;
  delay?: string;
}) {
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      style={{
        background: T.surf,
        border: `1px solid ${accentColor}25`,
        borderRadius: 12,
        padding: '28px 26px',
        flex: 1,
        minWidth: 220,
      }}
    >
      <div style={{
        fontFamily: T.serif,
        fontSize: 36,
        color: accentColor,
        marginBottom: 4,
        lineHeight: 1,
      }}>
        {stat}
      </div>
      <div style={{
        fontFamily: T.body,
        fontWeight: 700,
        fontSize: 13,
        color: T.tx,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <p style={{
        fontFamily: T.body,
        fontSize: 14,
        lineHeight: 1.75,
        color: T.tx2,
        margin: 0,
      }}>
        {body}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('landing');
  const [scrolled, setScrolled] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useScrollReveal();

  // Navbar scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Stats counter trigger
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const langCount = useCountUp(17, 1000, statsVisible);
  const navLinks = [
    { label: t('nav.overview'), href: '#research' },
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.evidence'), href: '#evidence' },
    { label: t('nav.designPrinciples'), href: '#principles' },
  ];
  const platformCards = [
    {
      title: t('platform.parentPortal.title'),
      subtitle: t('platform.parentPortal.subtitle'),
      accentColor: T.pri,
      delay: '1',
      items: t('platform.parentPortal.items', { returnObjects: true }) as string[],
    },
    {
      title: t('platform.teacherPortal.title'),
      subtitle: t('platform.teacherPortal.subtitle'),
      accentColor: T.teal,
      delay: '2',
      items: t('platform.teacherPortal.items', { returnObjects: true }) as string[],
    },
    {
      title: t('platform.adminPortal.title'),
      subtitle: t('platform.adminPortal.subtitle'),
      accentColor: T.blue,
      delay: '3',
      items: t('platform.adminPortal.items', { returnObjects: true }) as string[],
    },
  ];
  const featureItems = [
    { icon: '🌐', accentColor: T.teal, title: t('features.items.multilingual.title'), description: t('features.items.multilingual.description') },
    { icon: '📋', accentColor: T.pri, title: t('features.items.reports.title'), description: t('features.items.reports.description'), flip: true },
    { icon: '🏠', accentColor: T.amber, title: t('features.items.suggestions.title'), description: t('features.items.suggestions.description') },
    { icon: '💬', accentColor: T.blue, title: t('features.items.messaging.title'), description: t('features.items.messaging.description'), flip: true },
    { icon: '🤖', accentColor: T.teal, title: t('features.items.teacherAi.title'), description: t('features.items.teacherAi.description') },
    { icon: '📊', accentColor: T.pri, title: t('features.items.dashboard.title'), description: t('features.items.dashboard.description'), flip: true },
  ];
  const principleItems = ['01', '02', '03', '04', '05', '06'].map((number, index) => ({
    number,
    delay: String(index + 1),
    title: t(`principles.items.${number}.title`),
    body: t(`principles.items.${number}.body`),
  }));
  const aiCards = [
    { icon: '📝', delay: '1', title: t('ai.cards.reports.title'), body: t('ai.cards.reports.body') },
    { icon: '✉️', delay: '2', title: t('ai.cards.personalisation.title'), body: t('ai.cards.personalisation.body') },
    { icon: '🔤', delay: '3', title: t('ai.cards.translation.title'), body: t('ai.cards.translation.body') },
  ];
  const impactCards = [
    { stat: '17', label: t('reach.cards.languages.label'), body: t('reach.cards.languages.body'), accentColor: T.pri, delay: '1' },
    { stat: '1 in 5', label: t('reach.cards.lote.label'), body: t('reach.cards.lote.body'), accentColor: T.teal, delay: '2' },
    { stat: '3', label: t('reach.cards.roles.label'), body: t('reach.cards.roles.body'), accentColor: T.blue, delay: '3' },
  ];
  const techStack = [
    { label: t('technical.stackLabels.frontend'), value: t('technical.stackValues.frontend') },
    { label: t('technical.stackLabels.ui'), value: t('technical.stackValues.ui') },
    { label: t('technical.stackLabels.backend'), value: t('technical.stackValues.backend') },
    { label: t('technical.stackLabels.ai'), value: t('technical.stackValues.ai') },
    { label: t('technical.stackLabels.i18n'), value: t('technical.stackValues.i18n') },
    { label: t('technical.stackLabels.state'), value: t('technical.stackValues.state') },
  ];
  const footerPlatformLinks = [
    { label: t('footer.features'), href: '#features' },
    { label: t('footer.designPrinciples'), href: '#principles' },
    { label: t('footer.curricu'), href: '#evidence' },
  ];
  const footerResearchLinks = [
    { label: t('footer.researchBasis'), href: '#research' },
    { label: t('footer.evidenceReview'), href: '#features' },
    { label: t('footer.signIn'), href: '/login' },
  ];

  return (
    <>
      {/* Inject global styles once */}
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        background: T.bg,
        minHeight: '100vh',
        fontFamily: T.body,
        color: T.tx,
        overflowX: 'hidden',
      }}>

        {/* ── 1. Fixed Navbar ─────────────────────────────────── */}
        <nav style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled ? '#FFFBF5' : 'transparent',
          boxShadow: scrolled ? '0 2px 20px rgba(42,53,96,0.08)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          borderBottom: scrolled ? `1px solid ${T.bd}` : '1px solid transparent',
        }}>
          <div style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '0 32px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <a href="#" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoCombo size={28} />
            </a>

            {/* Nav links */}
            <div style={{
              display: 'flex',
              gap: 32,
              alignItems: 'center',
            }}>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontFamily: T.body,
                    fontWeight: 600,
                    fontSize: 14,
                    color: T.tx,
                    textDecoration: 'none',
                    opacity: 0.75,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
                >
                  {link.label}
                </a>
              ))}

              {/* Sign In button */}
              <button
                onClick={() => navigate('/login')}
                style={{
                  fontFamily: T.body,
                  fontWeight: 700,
                  fontSize: 14,
                  color: T.pri,
                  background: 'transparent',
                  border: `1.5px solid ${T.pri}`,
                  borderRadius: 8,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.pri;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = T.pri;
                }}
              >
                {t('nav.signIn')} →
              </button>
            </div>
          </div>
        </nav>

        {/* ── 2. Hero Section ─────────────────────────────────── */}
        <section style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, #FFE0C8 0%, ${T.bg} 65%)`,
          paddingTop: 140,
          paddingBottom: 80,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle animated gradient orb */}
          <div style={{
            position: 'absolute',
            top: -120,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${T.pri}12 0%, transparent 70%)`,
            animation: 'hero-gradient-pulse 6s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -80,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${T.teal}10 0%, transparent 70%)`,
            animation: 'hero-gradient-pulse 8s ease-in-out infinite reverse',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', position: 'relative' }}>
            {/* Academic badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: T.surf,
              border: `1px solid ${T.pri}40`,
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 36,
              animation: 'fade-in 0.8s ease both',
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: T.pri,
                flexShrink: 0,
                display: 'inline-block',
              }} />
              <span style={{
                fontFamily: T.body,
                fontWeight: 700,
                fontSize: 12,
                color: T.pri,
                letterSpacing: '0.06em',
              }}>
                {t('hero.badge')}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: T.serif,
              fontSize: 'clamp(34px, 5vw, 56px)',
              fontWeight: 400,
              color: T.tx,
              lineHeight: 1.15,
              maxWidth: 820,
              marginBottom: 28,
              animation: 'fade-in-up 0.8s 0.1s ease both',
            }}>
              {t('hero.title')}
            </h1>

            {/* Subheadline */}
            <p style={{
              fontFamily: T.body,
              fontSize: 18,
              lineHeight: 1.75,
              color: T.tx2,
              maxWidth: 680,
              marginBottom: 44,
              animation: 'fade-in-up 0.8s 0.2s ease both',
            }}>
              {t('hero.body')}
            </p>

            {/* CTA buttons */}
            <div style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              animation: 'fade-in-up 0.8s 0.3s ease both',
            }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  fontFamily: T.body,
                  fontWeight: 700,
                  fontSize: 15,
                  background: T.pri,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 30px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: `0 4px 18px ${T.pri}38`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${T.pri}45`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 18px ${T.pri}38`;
                }}
              >
                {t('hero.primaryCta')}
              </button>
              <a
                href="#research"
                style={{
                  fontFamily: T.body,
                  fontWeight: 700,
                  fontSize: 15,
                  background: 'transparent',
                  color: T.tx,
                  border: `1.5px solid ${T.bd}`,
                  borderRadius: 10,
                  padding: '14px 30px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'border-color 0.2s',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.tx2)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.bd)}
              >
                {t('hero.secondaryCta')}
              </a>
            </div>

            {/* Divider + abstract stat cards */}
            <div style={{
              borderTop: `1px solid ${T.bd}`,
              marginTop: 64,
              paddingTop: 40,
            }}>
              <div ref={statsRef} style={{
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
              }}>
                {/* Stat 1 */}
                <div className="al-fade-up al-stagger-1" style={{
                  flex: 1,
                  minWidth: 220,
                  background: T.surf,
                  border: `1px solid ${T.bd}`,
                  borderRadius: 12,
                  padding: '24px 26px',
                }}>
                  <div style={{ fontFamily: T.serif, fontSize: 32, color: T.pri, marginBottom: 6 }}>
                    {t('hero.stats.portalsValue')}
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t('hero.stats.portalsLabel')}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    {t('hero.stats.portalsBody')}
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="al-fade-up al-stagger-2" style={{
                  flex: 1,
                  minWidth: 220,
                  background: T.surf,
                  border: `1px solid ${T.bd}`,
                  borderRadius: 12,
                  padding: '24px 26px',
                }}>
                  <div style={{ fontFamily: T.serif, fontSize: 32, color: T.teal, marginBottom: 6 }}>
                    {statsVisible ? langCount : 0} {t('hero.stats.languagesUnit')}
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t('hero.stats.languagesLabel')}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    {t('hero.stats.languagesBody')}
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="al-fade-up al-stagger-3" style={{
                  flex: 1,
                  minWidth: 220,
                  background: T.surf,
                  border: `1px solid ${T.bd}`,
                  borderRadius: 12,
                  padding: '24px 26px',
                }}>
                  <div style={{ fontFamily: T.serif, fontSize: 32, color: T.amber, marginBottom: 6 }}>
                    {t('hero.stats.curricuValue')}
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t('hero.stats.curricuLabel')}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    {t('hero.stats.curricuBody')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. The Problem ──────────────────────────────────── */}
        <Section id="research" bg={T.surf}>
          <Eyebrow>{t('problem.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>{t('problem.title')}</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP>{t('problem.p1')}</BodyP>
            <BodyP>{t('problem.p2')}</BodyP>
            <BodyP>{t('problem.p3')}</BodyP>
            <BodyP>{t('problem.p4')}</BodyP>
          </div>

          {/* Key insight cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            marginTop: 12,
          }}>
            <CitationCard
              quote={t('problem.citations.oneWay.quote')}
              citation={t('problem.citations.oneWay.citation')}
              delay="1"
            />
            <CitationCard
              quote={t('problem.citations.language.quote')}
              citation={t('problem.citations.language.citation')}
              delay="2"
            />
            <CitationCard
              quote={t('problem.citations.workload.quote')}
              citation={t('problem.citations.workload.citation')}
              delay="3"
            />
          </div>
        </Section>

        {/* ── 4. Platform Overview ─────────────────────────────── */}
        <Section id="platform" bg={T.bg}>
          <Eyebrow>{t('platform.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>{t('platform.title')}</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP style={{ maxWidth: 780 }}>{t('platform.body')}</BodyP>
          </div>

          <div style={{
            display: 'flex',
            gap: 22,
            flexWrap: 'wrap',
            marginTop: 16,
          }}>
            {platformCards.map((card) => (
              <PortalCard key={card.title} {...card} />
            ))}
          </div>
        </Section>

        {/* ── 5. Features with Evidence ───────────────────────── */}
        <section id="features" style={{ background: T.surf, padding: '80px 0' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
            <Eyebrow>{t('features.eyebrow')}</Eyebrow>
            <div className="al-fade-up">
              <SectionTitle>{t('features.title')}</SectionTitle>
            </div>
            <div className="al-fade-up al-stagger-1">
              <BodyP style={{ maxWidth: 720 }}>{t('features.body')}</BodyP>
            </div>

            {featureItems.map((feature) => (
              <FeatureBlock key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        {/* ── 6. Design Principles ─────────────────────────────── */}
        <Section id="principles" bg={T.bg}>
          <Eyebrow>{t('principles.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle center>{t('principles.title')}</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP style={{ maxWidth: 720, textAlign: 'center', margin: '0 auto 40px' }}>
              {t('principles.body')}
            </BodyP>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {principleItems.map((principle) => (
              <PrincipleCard key={principle.number} {...principle} />
            ))}
          </div>
        </Section>

        {/* ── 7. CurricuLLM Integration ───────────────────────── */}
        <Section id="evidence" bg={T.surf}>
          <Eyebrow>{t('ai.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>{t('ai.title')}</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 380px' }} className="al-fade-left">
              <BodyP>{t('ai.p1')}</BodyP>
              <BodyP>{t('ai.p2')}</BodyP>
              <BodyP>{t('ai.p3')}</BodyP>
            </div>

            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {aiCards.map((card) => (
                <CurricuCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── 8. Who It's For ──────────────────────────────────── */}
        <Section bg={T.bg}>
          <Eyebrow>{t('reach.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>{t('reach.title')}</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px' }} className="al-fade-left">
              <BodyP>{t('reach.p1')}</BodyP>
              <BodyP>{t('reach.p2')}</BodyP>
              <BodyP>{t('reach.p3')}</BodyP>
            </div>

            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {impactCards.map((card) => (
                <ImpactCard key={`${card.stat}-${card.label}`} {...card} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── 9. Technical Architecture — removed ─────────────── */}
        {false && <Section bg={T.surf2}>
          <Eyebrow>{t('technical.eyebrow')}</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>{t('technical.title')}</SectionTitle>
          </div>

          <div style={{
            display: 'flex',
            gap: 32,
            flexWrap: 'wrap',
            marginTop: 8,
          }}>
            {/* Stack overview */}
            <div className="al-fade-left" style={{
              flex: '1 1 300px',
              background: T.surf,
              border: `1px solid ${T.bd}`,
              borderRadius: 12,
              padding: '28px 28px',
            }}>
              <h3 style={{
                fontFamily: T.serif,
                fontSize: 20,
                fontWeight: 400,
                color: T.tx,
                marginBottom: 20,
              }}>
                {t('technical.stackTitle')}
              </h3>
              {techStack.map((item) => (
                <div key={item.label} style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${T.bd}`,
                }}>
                  <span style={{
                    fontFamily: T.body,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: T.tx3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                    width: 110,
                    paddingTop: 2,
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontFamily: T.body,
                    fontSize: 14,
                    color: T.tx2,
                    lineHeight: 1.5,
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Architecture note */}
            <div className="al-fade-right" style={{
              flex: '1 1 380px',
              background: T.surf,
              border: `1px solid ${T.bd}`,
              borderRadius: 12,
              padding: '28px 28px',
            }}>
              <h3 style={{
                fontFamily: T.serif,
                fontSize: 20,
                fontWeight: 400,
                color: T.tx,
                marginBottom: 16,
              }}>
                {t('technical.architectureNotes')}
              </h3>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                marginBottom: 16,
              }}>
                {t('technical.p1')}
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                marginBottom: 16,
              }}>
                {t('technical.p2')}
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                margin: 0,
              }}>
                {t('technical.p3')}
              </p>
            </div>
          </div>
        </Section>}

        {/* ── 10. Footer ──────────────────────────────────────── */}
        <footer style={{
          background: T.tx,
          padding: '52px 0 36px',
        }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 32,
              paddingBottom: 40,
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
            }}>
              {/* Brand */}
              <div style={{ flex: '1 1 280px' }}>
                <div style={{ marginBottom: 12 }}>
                  <LogoCombo size={28} light />
                </div>
                <p style={{
                  fontFamily: T.body,
                  fontSize: 14,
                  color: 'rgba(255,244,230,0.6)',
                  lineHeight: 1.7,
                  maxWidth: 320,
                  margin: 0,
                }}>
                  {t('footer.brandBody')}
                </p>
              </div>

              {/* Links */}
              <div style={{
                display: 'flex',
                gap: 48,
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{
                    fontFamily: T.body,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,244,230,0.4)',
                    marginBottom: 16,
                  }}>
                    {t('footer.platform')}
                  </div>
                  {footerPlatformLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      style={{
                        display: 'block',
                        fontFamily: T.body,
                        fontSize: 14,
                        color: 'rgba(255,244,230,0.7)',
                        textDecoration: 'none',
                        marginBottom: 10,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = T.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,244,230,0.7)')}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>

                <div>
                  <div style={{
                    fontFamily: T.body,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,244,230,0.4)',
                    marginBottom: 16,
                  }}>
                    {t('footer.research')}
                  </div>
                  {footerResearchLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={l.href === '/login' ? (e) => { e.preventDefault(); navigate('/login'); } : undefined}
                      style={{
                        display: 'block',
                        fontFamily: T.body,
                        fontSize: 14,
                        color: 'rgba(255,244,230,0.7)',
                        textDecoration: 'none',
                        marginBottom: 10,
                        transition: 'color 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = T.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,244,230,0.7)')}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 28,
            }}>
              <p style={{
                fontFamily: T.body,
                fontSize: 13,
                color: 'rgba(255,244,230,0.4)',
                margin: 0,
              }}>
                {t('footer.bottomLeft')}
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 13,
                color: 'rgba(255,244,230,0.3)',
                margin: 0,
              }}>
                {t('footer.bottomRight')}
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
