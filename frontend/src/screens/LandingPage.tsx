// ============================================================
// LandingPage — Academy Linker public research/product overview
// Standalone component (no AppShell). Forces day-mode colors.
// Academic/research aesthetic — DM Serif Display + Nunito
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
              {[
                { label: 'Overview', href: '#research' },
                { label: 'Features', href: '#features' },
                { label: 'Evidence', href: '#evidence' },
                { label: 'Design Principles', href: '#principles' },
              ].map((link) => (
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
                Sign In →
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
                Submitted to EduX Hackathon 2026 · CurricuLLM Challenge
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
              Closing the Home–School Communication Gap Through AI-Mediated,{' '}
              Culturally-Responsive Dialogue
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
              Academy Linker connects parents and teachers through real-time, AI-translated messaging,
              automated progress reports, and personalised learning insights — one platform that works
              in every language a family speaks.
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
                Explore the Platform
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
                See How It Works
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
                    3 Portals
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Role-Specific Design
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    Separate interfaces for parents, teachers, and admins — each optimised for its user's workflow and information needs.
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
                    {statsVisible ? langCount : 0} Languages
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Multilingual Support
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    Covering the major languages spoken across Australian school communities, with curriculum-aware translation via CurricuLLM.
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
                    CurricuLLM
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Curriculum Intelligence API
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    Australian Curriculum-aligned AI intelligence for generative content
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. The Problem ──────────────────────────────────── */}
        <Section id="research" bg={T.surf}>
          <Eyebrow>The Problem</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>School Communication Is Fundamentally One-Way</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP>
              Most school communication systems are built around information delivery, not dialogue.
              A PDF report emailed once a term, a notice board app that pushes announcements,
              a parent portal that shows grades but accepts no replies — these tools share a common
              limitation: they transfer data from school to home, but they don't create a channel
              back. Parents receive information they can't act on, and teachers receive no signal
              about whether families understood or engaged with what was sent.
            </BodyP>
            <BodyP>
              The language barrier compounds this problem significantly. Approximately one in five
              Australian households communicates primarily in a language other than English. When
              school systems send reports and messages exclusively in English, a substantial portion
              of families are structurally locked out — not because they're disengaged, but because
              the infrastructure wasn't designed for them. The problem isn't motivation; it's access.
            </BodyP>
            <BodyP>
              Teachers face the inverse problem: they want to communicate meaningfully with families,
              but personalised outreach at scale is practically unsustainable within a normal teaching
              workload. Writing individual progress updates for 120+ students, translating them, and
              following up on replies represents hours of administrative work per week. Without tools
              that absorb that overhead, the system defaults to the lowest-effort option — which is
              the one-way broadcast.
            </BodyP>
            <BodyP>
              Academy Linker is built to address all three of these failure modes simultaneously:
              it creates a genuine two-way channel, makes that channel accessible in 17 languages,
              and reduces the cost of personalised teacher communication to near-zero through
              AI-assisted drafting and per-student post personalisation via the CurricuLLM API.
            </BodyP>
          </div>

          {/* Key insight cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            marginTop: 12,
          }}>
            <CitationCard
              quote="Most parent portals display data but provide no response mechanism. Parents can see a grade, but can't ask what it means or what to do next."
              citation="Failure Mode #1 — One-directional information delivery"
              delay="1"
            />
            <CitationCard
              quote="When school systems operate only in the dominant language, families from linguistic minority backgrounds face a structural access barrier — not a motivation deficit."
              citation="Failure Mode #2 — Language exclusion"
              delay="2"
            />
            <CitationCard
              quote="Personalised communication at scale is unsustainable without AI assistance. Without tooling, the system defaults to the lowest-effort option: the broadcast."
              citation="Failure Mode #3 — Teacher workload ceiling"
              delay="3"
            />
          </div>
        </Section>

        {/* ── 4. Platform Overview ─────────────────────────────── */}
        <Section id="platform" bg={T.bg}>
          <Eyebrow>Platform Architecture</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>A Structured Communication Ecosystem</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP style={{ maxWidth: 780 }}>
              Three dedicated portals serve the distinct needs of parents, teachers, and administrators.
              Each interface is purpose-built around its user's workflow: parents get a mobile-optimised
              dashboard focused on their child's data; teachers get class-level tools with AI drafting
              built into their posting and messaging workflow; admins get school-wide oversight with
              account management and engagement tracking.
            </BodyP>
          </div>

          <div style={{
            display: 'flex',
            gap: 22,
            flexWrap: 'wrap',
            marginTop: 16,
          }}>
            <PortalCard
              title="Parent Portal"
              subtitle="Designed for time-constrained caregivers. Prioritises at-a-glance dashboards, multilingual access, and actionable take-home guidance over dense information delivery."
              accentColor={T.pri}
              delay="1"
              items={[
                'Real-time academic dashboard with longitudinal trend analysis',
                'Subject-level performance with AI-generated narrative insights',
                'Personalised at-home learning recommendations per subject',
                'Multilingual 1:1 messaging with subject teachers',
                'AI-generated term progress reports with narrative analysis',
                'Leave management and anonymous incident reporting',
              ]}
            />
            <PortalCard
              title="Teacher Portal"
              subtitle="Workload-sensitive design: AI drafts, batch publishing, and at-risk flagging are integrated into the natural teaching workflow rather than imposed as additional obligations."
              accentColor={T.teal}
              delay="2"
              items={[
                'Whole-class and individual student performance overview',
                'AI-assisted class post creation with per-student personalisation',
                'Direct messaging with at-risk parent flagging',
                'AI reply drafts to reduce cognitive load of routine responses',
                'Batch publishing to multiple student cohorts simultaneously',
              ]}
            />
            <PortalCard
              title="Admin Portal"
              subtitle="School-wide oversight with audit-grade accountability. Manages the institutional layer that enables the parent-teacher communication infrastructure to function at scale."
              accentColor={T.blue}
              delay="3"
              items={[
                'School-wide parental engagement analytics',
                'Teacher, class, student and parent account management',
                'Parent-student binding with audit trail',
                'Communication compliance monitoring',
                'EAL/D language preference tracking and reporting',
              ]}
            />
          </div>
        </Section>

        {/* ── 5. Features with Evidence ───────────────────────── */}
        <section id="features" style={{ background: T.surf, padding: '80px 0' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
            <Eyebrow>Features</Eyebrow>
            <div className="al-fade-up">
              <SectionTitle>What the Platform Does</SectionTitle>
            </div>
            <div className="al-fade-up al-stagger-1">
              <BodyP style={{ maxWidth: 720 }}>
                Each feature addresses a specific failure mode of existing school communication tools.
                Hover any feature to see its description and the design rationale behind it.
              </BodyP>
            </div>

            <FeatureBlock
              icon="🌐"
              title="Multilingual AI Communication"
              accentColor={T.teal}
              description="All content — messages, reports, AI insights, notifications — is translated into 17 languages in real time via CurricuLLM. Parents toggle translation per message. The layer is curriculum-aware: pedagogical terms are rendered meaningfully, not literally."
            />

            <FeatureBlock
              icon="📋"
              title="AI-Generated Progress Reports"
              flip
              accentColor={T.pri}
              description="CurricuLLM generates per-student, per-term narrative reports cached by student UUID × language. Each report includes subject scores, trend analysis, and plain-language recommendations — calibrated against ACARA Achievement Standards."
            />

            <FeatureBlock
              icon="🏠"
              title="Personalised At-Home Learning Suggestions"
              accentColor={T.amber}
              description="Subject-specific 10–15 minute activities are generated from each student's current performance data, differentiated by performance band. CurricuLLM ensures suggestions align with the relevant curriculum strand and year level."
            />

            <FeatureBlock
              icon="💬"
              title="Two-Way Structured Messaging"
              flip
              accentColor={T.blue}
              description="Thread-based 1:1 messaging between parents and subject teachers. Each thread is subject-scoped for contextual continuity. Unread badges update via 5-second polling — no WebSocket required, compatible with school network environments."
            />

            <FeatureBlock
              icon="🤖"
              title="AI-Assisted Teacher Communication"
              accentColor={T.teal}
              description="Teachers write one post; CurricuLLM personalises it for every student's parent with their name, current scores, and relevant context. AI reply drafts are available in the messaging interface to reduce the cost of routine responses."
            />

            <FeatureBlock
              icon="📊"
              title="Academic Progress Dashboard"
              flip
              accentColor={T.pri}
              description="Longitudinal trend charts benchmarked against class averages across all subjects. The dashboard prioritises trajectory over point-in-time — a 72 improving from 58 reads very differently from a 72 declining from 88. At-risk flags are trajectory-based, not threshold-based."
            />
          </div>
        </section>

        {/* ── 6. Design Principles ─────────────────────────────── */}
        <Section id="principles" bg={T.bg}>
          <Eyebrow>Evidence-Based Design</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle center>Guided by Evidence-Based Design Principles</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP style={{ maxWidth: 720, textAlign: 'center', margin: '0 auto 40px' }}>
              Six principles shaped every architecture and interaction decision. Hover each card to read the full reasoning.
            </BodyP>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            <PrincipleCard
              number="01"
              title="Reduce Cognitive Load"
              delay="1"
              body="Secondary detail is progressively disclosed rather than foregrounded. The dashboard surfaces the three most salient signals — trend, attendance, unread messages — before presenting granular data. A 30-second read for a busy parent; a deeper read for one who has time."
            />
            <PrincipleCard
              number="02"
              title="Actionability Over Information"
              delay="2"
              body="Every surface is designed around a specific next action: reply, read a report, request leave, access a learning resource. Screens that present data without a clear response path were avoided — information without a next step tends to be ignored."
            />
            <PrincipleCard
              number="03"
              title="Linguistic Equity"
              delay="3"
              body="CurricuLLM translates communicative intent, not just words. Curriculum terms like 'working towards' or 'achievement standard' have precise meanings that literal translation destroys. The output must be understandable by a non-specialist parent regardless of schooling background."
            />
            <PrincipleCard
              number="04"
              title="Minimising Teacher Workload"
              delay="4"
              body="AI features were designed by starting from the teacher's existing workflow — identifying where the system can absorb drafting, personalising, and translating. The teacher provides intent and judgement; execution at scale is handled automatically."
            />
            <PrincipleCard
              number="05"
              title="Aggregating Teacher Observation"
              delay="5"
              body="A teacher's view of a student is built across dozens of weekly interactions — none of which reaches parents in a usable form. Each post, update, and score is treated as a data point, aggregated into a unified profile, then synthesised by CurricuLLM into a coherent narrative."
            />
            <PrincipleCard
              number="06"
              title="Personalised Reporting"
              delay="6"
              body="A class-level report is written for no one in particular. Each CurricuLLM report is individualised to the student's performance band and subject trajectory — recommendations differ meaningfully between a student falling behind in one strand and one who is ahead but inconsistent."
            />
          </div>
        </Section>

        {/* ── 7. CurricuLLM Integration ───────────────────────── */}
        <Section id="evidence" bg={T.surf}>
          <Eyebrow>AI Integration</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>Curriculum Intelligence via CurricuLLM</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 380px' }} className="al-fade-left">
              <BodyP>
                Academy Linker integrates the CurricuLLM API — a curriculum-trained AI service
                aligned with Australian Curriculum standards — for all generative AI tasks within
                the platform. This is a deliberate architectural choice: rather than routing requests
                through a general-purpose large language model, we employ a domain-specific API that
                has been trained and calibrated against ACARA achievement standards, curriculum
                strand descriptions, and Australian pedagogical conventions.
              </BodyP>
              <BodyP>
                The specific integration points are: (1) progress report generation, in which the API
                produces structured narrative reports that contextualise student scores within the
                relevant curriculum progressions for each learning area; (2) class post personalisation,
                where a single teacher-authored post is transformed into individually addressed
                communications for each student's parent, incorporating the student's name, performance
                data, and contextual details; (3) at-home learning suggestion generation, differentiated
                by subject and performance band relative to achievement standard thresholds; and (4)
                real-time translation of all dynamic content — messages, reports, AI insights, and
                system notifications — into the 17 supported languages.
              </BodyP>
              <BodyP>
                Using a curriculum-trained API rather than a generic language model is a deliberate
                architectural choice with real consequences. A general-purpose LLM can describe what
                Year 6 maths looks like in broad strokes, but it cannot reliably distinguish between
                achievement level descriptors, will misrepresent what "working towards" means in a
                specific learning area, and will generate at-home recommendations that are grade-level
                inappropriate. CurricuLLM is trained against ACARA achievement standards, so the
                content it produces stays grounded in the actual framework teachers use — which is the
                minimum bar for content that parents will treat as authoritative.
              </BodyP>
            </div>

            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <CurricuCard
                icon="📝"
                title="Narrative Report Generation"
                delay="1"
                body="Generates per-student, per-term, per-language progress reports cached by student UUID × language. Narrative is framed against curriculum achievement standards and calibrated for a parent audience, avoiding specialist assessment terminology while preserving pedagogical accuracy."
              />
              <CurricuCard
                icon="✉️"
                title="Post Personalisation at Scale"
                delay="2"
                body="Transforms a single teacher post into individually addressed parent communications, incorporating each student's name, current performance data, and relevant contextual details. Enables personalised outreach without proportional increase in teacher time investment."
              />
              <CurricuCard
                icon="🔤"
                title="Real-Time Dynamic Translation"
                delay="3"
                body="Translates all dynamic platform content — including AI-generated insights, message threads, and system notifications — across 17 languages. Translation is curriculum-aware, ensuring pedagogical terminology is rendered accessibly rather than literally."
              />
            </div>
          </div>
        </Section>

        {/* ── 8. Who It's For ──────────────────────────────────── */}
        <Section bg={T.bg}>
          <Eyebrow>Reach</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>Built for the Full Range of Australian School Communities</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px' }} className="al-fade-left">
              <BodyP>
                The communication gap isn't evenly distributed. Families who navigate school systems
                in a second language are systematically excluded from the information flows that
                affect their children's education — not because they're disengaged, but because the
                systems weren't built for them. A progress report only in English isn't accessible
                to a Mandarin-speaking parent. A message from a teacher that can't be replied to in
                Vietnamese isn't a conversation.
              </BodyP>
              <BodyP>
                AI-mediated translation can't fix structural inequality, but it can remove one
                specific, addressable barrier: the language wall between school and home. When a
                parent receives a progress report in their native language and can reply to their
                child's teacher in that language, one concrete obstacle is eliminated. That's the
                scope of what the platform claims to do — and it's meaningful precisely because
                it's specific.
              </BodyP>
              <BodyP>
                The design implication is that multilingual support is a core feature, not a
                supplementary one. Every part of the platform — messages, reports, AI insights,
                system notifications — runs through the translation layer by default. The 17
                supported languages were selected to cover the actual distribution of languages
                spoken across Australian metropolitan school communities, not as a marketing figure.
              </BodyP>
            </div>

            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <ImpactCard
                stat="17"
                label="Languages supported"
                accentColor={T.pri}
                delay="1"
                body="Every dynamic content type — messages, reports, AI insights, system notifications — is translated in real time. Parents can toggle translation per message, and the translation layer is curriculum-aware rather than literal."
              />
              <ImpactCard
                stat="1 in 5"
                label="Australian households speak LOTE"
                accentColor={T.teal}
                delay="2"
                body="Approximately 22% of Australian households primarily communicate in a language other than English — a proportion significantly higher in metropolitan school catchments. These are the families most systematically excluded from English-only communication systems."
              />
              <ImpactCard
                stat="3"
                label="Roles. One platform."
                accentColor={T.blue}
                delay="3"
                body="Parents, teachers, and administrators each get a purpose-built interface. No shared inbox, no one-size-fits-all dashboard. Each portal is scoped to the workflow and information needs of its user."
              />
            </div>
          </div>
        </Section>

        {/* ── 9. Technical Architecture — removed ─────────────── */}
        {false && <Section bg={T.surf2}>
          <Eyebrow>Technical Implementation</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>Technical Architecture</SectionTitle>
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
                Technology Stack
              </h3>
              {[
                { label: 'Frontend', value: 'React 19 · TypeScript · Vite · Tailwind CSS v4' },
                { label: 'UI Library', value: 'shadcn/ui · Radix UI primitives' },
                { label: 'Backend', value: 'Python · Flask · JWT authentication' },
                { label: 'AI Integration', value: 'CurricuLLM API (curriculum-aligned)' },
                { label: 'Internationalisation', value: 'i18next · 17 language bundles' },
                { label: 'State', value: 'React Context API · Custom hooks' },
              ].map((item) => (
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
                Architecture Notes
              </h3>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                marginBottom: 16,
              }}>
                The system uses a Python/Flask mock backend with JWT authentication, persisted
                unread state with timestamp-based read tracking, and 5-second background polling
                for real-time badge updates. The polling interval was chosen to balance message
                latency against server load in a school network context; it is configurable via
                environment variable for deployment environments with stricter rate limits.
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                marginBottom: 16,
              }}>
                The CurricuLLM API integration layer caches responses by student UUID × language
                pair to minimise redundant API calls. Progress reports are generated on first
                request per term and served from cache on subsequent requests, ensuring temporal
                consistency within a reporting period. Translation responses are cached at the
                message level with a content-hash key, allowing efficient re-use across multiple
                parent requests for the same message.
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 14.5,
                lineHeight: 1.85,
                color: T.tx2,
                margin: 0,
              }}>
                The frontend is a single-page application with role-based rendering: parent,
                teacher, and admin views are served from a single bundle with route-level
                access control enforced at both the client and API layers. JWT refresh is
                handled transparently via a 401-intercept layer in the API client.
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
                  A communication platform built for schools — connecting parents and teachers
                  across languages, subjects, and time zones through AI-assisted, two-way dialogue.
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
                    Platform
                  </div>
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Design Principles', href: '#principles' },
                    { label: 'CurricuLLM', href: '#evidence' },
                  ].map((l) => (
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
                    Research
                  </div>
                  {[
                    { label: 'Research Basis', href: '#research' },
                    { label: 'Evidence Review', href: '#features' },
                    { label: 'Sign In', href: '/login' },
                  ].map((l) => (
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
                Academy Linker · EduX Hackathon 2026 · Built on CurricuLLM
              </p>
              <p style={{
                fontFamily: T.body,
                fontSize: 13,
                color: 'rgba(255,244,230,0.3)',
                margin: 0,
              }}>
                Research references: Hattie (2009) · OECD (2019) · Epstein (2001) · Black &amp; Wiliam (1998) · UNESCO (2016)
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
