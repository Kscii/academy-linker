// ============================================================
// LandingPage — Academy Linker public research/product overview
// Standalone component (no AppShell). Forces day-mode colors.
// Academic/research aesthetic — DM Serif Display + Nunito
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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

// ── Academic citation card ─────────────────────────────────────
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
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p style={{
        fontFamily: T.serif,
        fontStyle: 'italic',
        fontSize: 16,
        lineHeight: 1.75,
        color: T.tx,
        margin: 0,
      }}>
        &ldquo;{quote}&rdquo;
      </p>
      <p style={{
        fontFamily: T.body,
        fontSize: 13,
        color: T.tx3,
        fontWeight: 600,
        margin: 0,
      }}>
        — {citation}
      </p>
    </div>
  );
}

// ── Feature block (alternating layout) ───────────────────────
function FeatureBlock({
  icon,
  title,
  description,
  researchBasis,
  flip,
  accentColor,
}: {
  icon: string;
  title: string;
  description: string;
  researchBasis: string;
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
        padding: '48px 0',
        borderBottom: `1px solid ${T.bd}`,
      }}
    >
      {/* Icon column */}
      <div style={{
        flexShrink: 0,
        width: 72,
        height: 72,
        borderRadius: 18,
        background: `${accent}18`,
        border: `1.5px solid ${accent}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
      }}>
        {icon}
      </div>
      {/* Text column */}
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontFamily: T.serif,
          fontSize: 24,
          fontWeight: 400,
          color: T.tx,
          marginBottom: 12,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: T.body,
          fontSize: 16,
          lineHeight: 1.85,
          color: T.tx2,
          marginBottom: 20,
        }}>
          {description}
        </p>
        <div style={{
          background: `${accent}0D`,
          border: `1px solid ${accent}30`,
          borderRadius: 8,
          padding: '18px 22px',
        }}>
          <p style={{
            fontFamily: T.body,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 8,
          }}>
            Research Basis
          </p>
          <p style={{
            fontFamily: T.body,
            fontSize: 14.5,
            lineHeight: 1.8,
            color: T.tx2,
            margin: 0,
          }}>
            {researchBasis}
          </p>
        </div>
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
  return (
    <div
      className={`al-fade-up${delay ? ` al-stagger-${delay}` : ''}`}
      style={{
        background: T.surf,
        border: `1px solid ${T.bd}`,
        borderRadius: 12,
        padding: '30px 28px',
      }}
    >
      <div style={{
        fontFamily: T.serif,
        fontSize: 42,
        color: `${T.pri}28`,
        lineHeight: 1,
        marginBottom: 12,
        fontWeight: 400,
      }}>
        {number}
      </div>
      <h3 style={{
        fontFamily: T.serif,
        fontSize: 20,
        fontWeight: 400,
        color: T.tx,
        marginBottom: 10,
      }}>
        {title}
      </h3>
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
            <a href="#" style={{ textDecoration: 'none' }}>
              <span style={{
                fontFamily: T.serif,
                fontSize: 22,
                color: T.pri,
                fontWeight: 400,
                letterSpacing: '-0.02em',
              }}>
                Academy Linker
              </span>
            </a>

            {/* Nav links */}
            <div style={{
              display: 'flex',
              gap: 32,
              alignItems: 'center',
            }}>
              {[
                { label: 'Research', href: '#research' },
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
              Academy Linker operationalises research on parental engagement, linguistic accessibility,
              and formative feedback loops to create a structured communication ecosystem between
              educators and families.
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
                Read the Research Basis
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
                    d = 0.51<span style={{ fontSize: 18 }}>+</span>
                  </div>
                  <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.tx, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Hattie Effect Size
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.tx2, lineHeight: 1.6 }}>
                    Parental involvement &amp; academic outcomes — Hattie (2009), synthesis of 800+ meta-analyses
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
                    Serving EAL/D families per ACARA recommendations — ABS 2021 Census data
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

        {/* ── 3. Research Foundation ──────────────────────────── */}
        <Section id="research" bg={T.surf}>
          <Eyebrow>Research Foundation</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>Grounded in Learning Science</SectionTitle>
          </div>
          <div className="al-fade-up al-stagger-1">
            <BodyP>
              The design of Academy Linker draws directly from four decades of empirical research on
              family-school partnerships. John Hattie's landmark Visible Learning synthesis (2009),
              which aggregated findings from over 800 meta-analyses encompassing more than 80 million
              students, identified parental involvement as one of the most significant out-of-school
              influences on academic achievement, yielding an effect size of d = 0.51 — well above the
              threshold of d = 0.40 that Hattie designates as the "hinge point" of meaningful
              educational influence. This places family engagement alongside interventions such as
              formative assessment and teacher feedback in its demonstrated impact on student outcomes.
            </BodyP>
            <BodyP>
              The OECD's PISA 2018 data further corroborates this finding at a systems level, revealing
              a statistically significant positive correlation between parental awareness of their
              child's academic standing and student performance in reading literacy across OECD
              member nations. Critically, however, the OECD's Strength through Diversity report (2019)
              cautions that this benefit is not uniformly distributed: families from linguistic minority
              backgrounds — including migrant families and those classified under Australia's
              EAL/D (English as an Additional Language or Dialect) framework — are structurally
              excluded from the benefits of parental engagement when school communication systems
              operate exclusively in the dominant language.
            </BodyP>
            <BodyP>
              The Australian Bureau of Statistics 2021 Census recorded that approximately 22% of
              Australians spoke a language other than English at home, with this proportion
              significantly higher in metropolitan school catchments. ACARA's EAL/D Learning
              Progression framework acknowledges that a non-trivial portion of Australia's student
              population arrives in classrooms where school-family communication is already partially
              or wholly inaccessible to at least one primary caregiver. This is not a marginal concern;
              it is a systemic equity issue.
            </BodyP>
            <BodyP>
              Joyce Epstein's Framework of School, Family, and Community Partnerships (2001)
              provides the theoretical scaffolding for Academy Linker's feature architecture. Epstein
              identifies six types of family involvement, of which Type 2 (Communicating), Type 4
              (Learning at Home), and Type 5 (Decision Making) are most predictive of academic
              benefit. Crucially, Epstein distinguishes between one-directional information delivery —
              the newsletter, the static parent portal, the term report mailed home — and genuine
              two-way communication that enables families to respond, query, and participate in their
              child's learning. Existing school communication infrastructure almost universally falls
              into the former category. Academy Linker is designed to operationalise the latter.
            </BodyP>
          </div>

          {/* Citation cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
            marginTop: 12,
          }}>
            <CitationCard
              quote="Parental involvement ranks among the top influences on student achievement, with an effect size of d = 0.51 in Hattie's synthesis of over 800 meta-analyses."
              citation="Hattie, J. (2009). Visible Learning: A Synthesis of Over 800 Meta-Analyses Relating to Achievement. Routledge."
              delay="1"
            />
            <CitationCard
              quote="Students from language-minority families are disproportionately disadvantaged when school communication is delivered only in the dominant language."
              citation="OECD (2019). Strength through Diversity: The Economic and Social Power of Inclusive Education. OECD Publishing."
              delay="2"
            />
            <CitationCard
              quote="Effective family-school partnerships require two-way communication, not one-directional information delivery."
              citation="Epstein, J. L. (2001). School, Family, and Community Partnerships: Preparing Educators and Improving Schools. Westview Press."
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
              Academy Linker implements Epstein's Type 2 (Communicating), Type 4 (Learning at Home),
              and Type 5 (Decision Making) partnership dimensions through three role-specific portals,
              each designed around the distinct informational needs and workflow constraints of its
              primary user. Rather than presenting a single undifferentiated interface, the platform
              acknowledges that parents, teachers, and administrators operate under different
              cognitive demands, time pressures, and institutional responsibilities.
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
            <Eyebrow>Features &amp; Evidence</Eyebrow>
            <div className="al-fade-up">
              <SectionTitle>Principled Feature Design</SectionTitle>
            </div>
            <div className="al-fade-up al-stagger-1">
              <BodyP style={{ maxWidth: 720 }}>
                Each feature in Academy Linker was designed in response to a specific, documented
                failure mode of existing school communication systems. The following sections describe
                each capability alongside the empirical literature that motivated its inclusion.
              </BodyP>
            </div>

            <FeatureBlock
              icon="🌐"
              title="Multilingual AI Communication"
              accentColor={T.teal}
              description="Academy Linker integrates the CurricuLLM curriculum-aware API to translate all dynamic content — messages, reports, subject names, AI insights, and system notifications — into 17 languages in real time. Translation is applied at the message level, allowing parents to toggle translations per message while preserving original text for bilingual families who prefer to read both versions. The translation layer is curriculum-aware, ensuring that pedagogical terminology is rendered in contextually appropriate registers rather than producing literal translations that obscure meaning."
              researchBasis="The Australian Bureau of Statistics (2021 Census) reports that approximately 22% of Australians speak a language other than English at home, with concentrations significantly higher in urban school catchments. Research by Scribner & Reyes (1999) and subsequent work codified in ACARA's EAL/D Learning Progression demonstrates that linguistic accessibility is a prerequisite for meaningful parental engagement — not a supplementary convenience. The UNESCO (2016) report on multilingual education explicitly recommends mother-tongue-based communication for effective family-school partnerships, noting that informational access and comprehension are not equivalent when communication occurs in a language of lower proficiency."
            />

            <FeatureBlock
              icon="📋"
              title="AI-Generated Progress Reports"
              flip
              accentColor={T.pri}
              description="Using the CurricuLLM API, Academy Linker generates structured narrative progress reports per student, per term, per language. Reports are cached by student UUID × language pair to prevent redundant API calls and ensure temporal consistency within a term. Each report includes subject-level scores, trend analysis relative to prior assessment periods, and specific actionable recommendations framed for a parent audience — deliberately avoiding curriculum jargon in favour of concrete, accessible language. The generation prompt is calibrated against Australian Curriculum Achievement Standards to ensure that narratives reflect the actual progression framework against which students are assessed."
              researchBasis="Black & Wiliam's (1998) foundational meta-analysis on formative assessment established that timely, specific feedback significantly improves learning outcomes, with effect sizes reaching d = 0.70 under optimal conditions. However, translating teacher assessment data into parent-legible formats remains a documented challenge: Wyatt-Smith & Cumming (2009) identify a persistent gap between teacher assessment literacy and parental comprehension of formal reports. Narrative AI reports bridge this gap by contextualising raw scores within curriculum progression frameworks. Importantly, this approach aligns with the Australian Curriculum's emphasis on standards-referenced reporting rather than norm-referenced grading."
            />

            <FeatureBlock
              icon="🏠"
              title="Personalised At-Home Learning Suggestions"
              accentColor={T.amber}
              description="The dashboard generates subject-specific learning suggestions derived from each student's live performance data. Suggestions are differentiated by performance band — below threshold and above threshold — and framed as concrete 10–15 minute parent-child activities that avoid curriculum jargon and require no specialist subject knowledge from the caregiver. This design reflects the research finding that effective Type 4 involvement (Learning at Home) requires structured guidance, not generic encouragement. The CurricuLLM API ensures that generated suggestions remain aligned with the relevant curriculum strand and year level, producing activities that are pedagogically coherent rather than generic."
              researchBasis="Cooper et al.'s (2006) meta-analysis on homework and academic achievement found that the quality of parental guidance during home learning activities is significantly more predictive of outcomes than the quantity of time spent. The Epstein Framework's Type 4 involvement explicitly requires that parents receive structured, actionable guidance tailored to their child's specific learning needs, rather than general encouragement. Hattie's effect size for structured parental involvement in learning activities — as distinct from unstructured monitoring — reaches d = 0.58, suggesting that the scaffolding provided to parents mediates the effectiveness of their involvement."
            />

            <FeatureBlock
              icon="💬"
              title="Two-Way Structured Messaging"
              flip
              accentColor={T.blue}
              description="Academy Linker implements thread-based 1:1 messaging between parents and individual subject teachers, with server-side read-state tracking, unread badge propagation via 5-second background polling, and per-message AI translation. Message threads are associated with specific subjects, providing contextual continuity across a semester of communication and enabling both parties to reference prior exchanges. The polling architecture ensures that unread counts remain accurate across browser sessions and devices without requiring WebSocket infrastructure, maintaining compatibility with school IT network environments that may restrict persistent connections."
              researchBasis="Kraft & Rogers (2015) conducted a randomised controlled trial demonstrating that brief, personalised teacher-to-parent messages increased student homework completion rates by 40% and reduced course failure rates by 25% over a semester. The critical finding was that two-way communication — in which parents could respond, ask questions, and initiate contact — produced significantly stronger effects than one-directional outreach alone. Walker et al. (2011) similarly found that the quality of the relationship between teacher and parent, operationalised as perceived responsiveness and mutual respect, was more predictive of sustained parental engagement than the raw frequency of contact."
            />

            <FeatureBlock
              icon="🤖"
              title="AI-Assisted Teacher Communication (CurricuLLM)"
              accentColor={T.teal}
              description="Teachers publish class posts once; the CurricuLLM API personalises each post for every student's parent by incorporating the student's name, specific performance data, and contextually relevant details drawn from the student's academic record. This produces individually addressed communications at scale without proportionally increasing teacher workload. AI reply drafts are available within the messaging interface, generating contextually appropriate response suggestions that teachers can edit and send, reducing the cognitive load associated with composing responses to recurring parent queries while preserving the teacher's voice and professional judgement."
              researchBasis="Burden et al. (2012) identified teacher time constraints as the primary systemic barrier to frequent, personalised parent communication in secondary schools, with teachers reporting that individualised communication was desirable but practically unsustainable within existing workload structures. The McKinsey Global Education Report (2020) found that high-performing school systems treat family engagement as a professional responsibility requiring dedicated tools and workflow integration — not as an optional supplementary activity. CurricuLLM's curriculum-aligned intelligence ensures that AI-generated content remains pedagogically accurate and aligned with ACARA achievement standards, mitigating the accuracy risks associated with deploying general-purpose language models in educational contexts."
            />

            <FeatureBlock
              icon="📊"
              title="Academic Progress Dashboard with Trend Analysis"
              flip
              accentColor={T.pri}
              description="Parents access a longitudinal view of their child's academic performance across all subjects, visualised as trend charts with class average benchmarking. The dashboard surfaces at-risk signals derived from score trajectories, attendance patterns, and engagement indicators alongside academic data, implementing a holistic model of student monitoring that extends beyond individual assessment events. The visualisation layer is designed to communicate trajectory — improvement, stability, or decline — rather than presenting scores as isolated data points, reflecting research findings that contextualised feedback produces more constructive parental responses than decontextualised grades."
              researchBasis="Zimmerman's (2002) self-regulation framework and subsequent empirical work by Schunk & Pajares (2009) establish that academic self-efficacy — a significant predictor of achievement — improves when students and families receive transparent, granular feedback on longitudinal progress rather than summary assessments. The PISA 2018 results documented a positive correlation (r = 0.43) between parent awareness of their child's current academic standing and student reading literacy scores across OECD countries, controlling for socioeconomic background. Critically, this correlation was stronger for families in the lower two quartiles of the socioeconomic distribution, suggesting that transparent progress information partially offsets the advantage conferred by higher parental educational attainment."
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
              Every design decision in Academy Linker is traceable to a research principle. The
              following four principles guided architecture choices, interaction design patterns,
              and AI integration decisions throughout development. Where tradeoffs arose between
              competing principles, we document the rationale for the resolution.
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
              body="Miller's Law (1956) and subsequent cognitive load theory (Sweller, 1988) inform our interface decisions throughout. Information is chunked into digestible units, progressive disclosure is employed where secondary detail is available but not foregrounded, and AI summarisation reduces information density for time-constrained parents who may be accessing the platform between work commitments. The dashboard foregrounds the three most salient signals (subject trend, attendance, unread messages) before presenting granular data."
            />
            <PrincipleCard
              number="02"
              title="Actionability Over Information"
              delay="2"
              body="Following Epstein's finding that information delivery alone does not reliably predict parental behaviour change, every feature is designed to produce a specific, low-friction action: reply to a message, read a report, request leave, access a structured learning resource. We deliberately avoid surfaces that present data without a clear next step, as research consistently shows that overwhelmed caregivers disengage from information-rich environments that do not scaffold a response."
            />
            <PrincipleCard
              number="03"
              title="Linguistic Equity"
              delay="3"
              body="Drawing on Cummins' (1979) foundational distinction between Basic Interpersonal Communication Skills (BICS) and Cognitive Academic Language Proficiency (CALP), Academy Linker translates not merely words but communicative intent — employing the CurricuLLM API to ensure that curriculum language is rendered in a register accessible to non-specialist parents, regardless of their schooling background. This is a stronger requirement than surface-level translation: it demands that AI-generated content be contextualised for the parent audience."
            />
            <PrincipleCard
              number="04"
              title="Minimising Teacher Workload"
              delay="4"
              body="Consistent with findings by Kraft et al. (2020) that unsupported communication mandates — where schools require frequent parent contact without providing tools or time — are a documented contributor to teacher burnout, Academy Linker positions its AI layer explicitly as a workload-reduction instrument. Features were designed by starting from the teacher's existing workflow and identifying where AI can absorb routine cognitive labour (drafting, personalising, translating), rather than by designing AI features first and asking teachers to adapt."
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
                Using a curriculum-trained API rather than a generic language model carries significant
                implications for accuracy and educational appropriateness. Generic LLMs, when applied
                to educational content generation, have been documented to produce advice inconsistent
                with national curriculum frameworks, misrepresent achievement level descriptors, and
                generate recommendations that are pedagogically unsound for the relevant year level.
                CurricuLLM's domain specificity mitigates these risks, ensuring that AI-generated
                content — which will be read by parents as authoritative representations of their
                child's educational progress — remains aligned with the official standards under which
                teachers are legally and professionally required to assess and report.
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

        {/* ── 8. Social Impact ─────────────────────────────────── */}
        <Section bg={T.bg}>
          <Eyebrow>Social Impact</Eyebrow>
          <div className="al-fade-up">
            <SectionTitle>Addressing Structural Inequity in Education</SectionTitle>
          </div>
          <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px' }} className="al-fade-left">
              <BodyP>
                The gap between home and school is not uniformly distributed across the student
                population. Research consistently demonstrates that communication barriers
                disproportionately affect migrant families, EAL/D households, and families with
                lower levels of formal educational attainment — the precise groups for whom parental
                engagement interventions show the strongest marginal benefit. The Australian Early
                Development Census (AEDC) data, collected at the kindergarten transition point,
                documents persistent correlations between socioeconomic background, linguistic
                minority status, and markers of developmental vulnerability. Children who begin
                formal schooling with lower school readiness scores are, on average, the children
                whose families are most likely to be excluded from school communication systems
                designed for fluent English-speaking, educationally-advantaged caregivers.
              </BodyP>
              <BodyP>
                Digitally-mediated, AI-translated communication cannot resolve structural socioeconomic
                disadvantage. However, it can partially offset one specific mechanism through which
                that disadvantage propagates: the exclusion of linguistically diverse families from
                the information flows that govern their children's education. When a Vietnamese-speaking
                parent in Western Sydney receives a curriculum-contextualised progress report in
                Vietnamese, and can respond to their child's teacher in Vietnamese, the linguistic
                barrier — which is a structural artefact of how school communication systems were
                built, not a characteristic of the family — is removed. This is a modest but
                measurable intervention in a complex system.
              </BodyP>
              <BodyP>
                UNESCO's Sustainable Development Goal 4 calls for inclusive and equitable quality
                education for all, with specific emphasis on reducing disparities associated with
                socioeconomic status, gender, disability, and linguistic background. The SDG 4
                monitoring framework explicitly identifies family engagement as a quality dimension
                of educational systems, not merely an outcome indicator. Academy Linker's design
                philosophy positions inclusive communication infrastructure as a component of
                educational quality, consistent with this framing.
              </BodyP>
            </div>

            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <ImpactCard
                stat="22%"
                label="of Australians speak LOTE at home"
                accentColor={T.pri}
                delay="1"
                body="ABS 2021 Census data — approximately 5.5 million Australians primarily communicate in a language other than English at home, with this proportion significantly higher in metropolitan school catchments where Academy Linker would be deployed."
              />
              <ImpactCard
                stat="r = 0.43"
                label="PISA 2018 engagement correlation"
                accentColor={T.teal}
                delay="2"
                body="OECD PISA 2018 data shows a correlation of r = 0.43 between parent awareness of school performance and student reading literacy, with stronger effects in lower socioeconomic quartiles — precisely the families most likely to face communication barriers."
              />
              <ImpactCard
                stat="SDG 4"
                label="UNESCO inclusive education mandate"
                accentColor={T.blue}
                delay="3"
                body="UNESCO's Sustainable Development Goal 4 explicitly identifies family engagement as a quality dimension of education systems, framing communication accessibility as an equity obligation rather than a supplementary service."
              />
            </div>
          </div>
        </Section>

        {/* ── 9. Technical Architecture ───────────────────────── */}
        <Section bg={T.surf2}>
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
        </Section>

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
                <div style={{
                  fontFamily: T.serif,
                  fontSize: 24,
                  color: T.bg,
                  marginBottom: 12,
                }}>
                  Academy Linker
                </div>
                <p style={{
                  fontFamily: T.body,
                  fontSize: 14,
                  color: 'rgba(255,244,230,0.6)',
                  lineHeight: 1.7,
                  maxWidth: 320,
                  margin: 0,
                }}>
                  Operationalising research on parental engagement, linguistic accessibility,
                  and formative feedback loops to create equitable communication between
                  educators and families.
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
