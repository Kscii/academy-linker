// ============================================================
// LandingPage — Academy Linker public marketing page
// Standalone component (no AppShell). Forces night-theme colors.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Design tokens (night theme hardcoded) ─────────────────────
const T = {
  bg:    '#07091A',
  bg2:   '#0C0F28',
  sb:    '#04050E',
  a1:    '#FF2070',
  a2:    '#00D4F5',
  a3:    '#FFE000',
  a4:    '#8B5CF6',
  tx:    '#EAE0FF',
  tx2:   '#9885C8',
  tx3:   '#5A4A7A',
  card:  '#0C0F2A',
  bd:    'rgba(0,212,245,0.15)',
  serif: "'DM Serif Display', serif",
  body:  "'Nunito', sans-serif",
} as const;

// ── CSS keyframes injected once ───────────────────────────────
const GLOBAL_STYLES = `
  @keyframes blob-drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(40px, -30px) scale(1.05); }
    66%       { transform: translate(-20px, 20px) scale(0.97); }
  }
  @keyframes marquee {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes float-1 {
    0%, 100% { transform: translateY(0px) rotate(-2deg); }
    50%       { transform: translateY(-10px) rotate(2deg); }
  }
  @keyframes float-2 {
    0%, 100% { transform: translateY(0px) rotate(1deg); }
    50%       { transform: translateY(-14px) rotate(-1deg); }
  }
  @keyframes float-3 {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50%       { transform: translateY(-8px) rotate(3deg); }
  }
  @keyframes chip-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 0.7; }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes gradient-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-fade-up {
    animation: fade-up 0.6s ease forwards;
  }
  .section-hidden {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .section-visible {
    opacity: 1;
    transform: translateY(0);
  }
  html { scroll-behavior: smooth; }
`;

// ── Scroll animation hook ─────────────────────────────────────
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ── Counter animation hook ────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setVal(Math.round(prog * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return val;
}

// ── Dot grid background ───────────────────────────────────────
function DotGrid() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      backgroundImage: `radial-gradient(circle, rgba(0,212,245,0.12) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
      pointerEvents: 'none',
    }} />
  );
}

// ── Mock UI card components ───────────────────────────────────
function MockAppCard({
  title, accent, delay, animKey, children,
}: {
  title: string; accent: string; delay: number; animKey: number; children: React.ReactNode;
}) {
  const animations = ['float-1', 'float-2', 'float-3'] as const;
  const anim = animations[animKey % 3];
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${accent}33`,
      borderRadius: 16,
      padding: '20px',
      width: 220,
      boxShadow: `0 8px 40px ${accent}22, 0 2px 12px rgba(0,0,0,0.6)`,
      animation: `${anim} ${3 + animKey * 0.4}s ease-in-out ${delay}s infinite`,
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 1, color: accent,
        textTransform: 'uppercase', marginBottom: 12, fontFamily: T.body,
      }}>{title}</div>
      {children}
    </div>
  );
}

function MockBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.tx2, fontFamily: T.body }}>{label}</span>
        <span style={{ fontSize: 11, color, fontFamily: T.body, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: T.tx3 + '44', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({
  icon, title, desc, accent, delay,
}: { icon: string; title: string; desc: string; accent: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card,
        border: `1px solid ${hovered ? accent : T.bd}`,
        borderRadius: 16,
        padding: '28px 24px',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.03) translateY(-4px)' : 'scale(1) translateY(0)',
        boxShadow: hovered ? `0 8px 32px ${accent}44` : '0 2px 12px rgba(0,0,0,0.4)',
        animationDelay: `${delay}s`,
        cursor: 'default',
      }}
      className="section-hidden"
    >
      <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
      <div style={{
        fontFamily: T.serif, fontSize: 18, color: T.tx, marginBottom: 10,
      }}>{title}</div>
      <p style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, lineHeight: 1.6, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');

  // scroll listener
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // IntersectionObserver for section-hidden / section-visible
  useEffect(() => {
    const els = document.querySelectorAll('.section-hidden');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('section-visible');
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });

  // active nav section
  useEffect(() => {
    const sections = ['hero', 'features', 'how-it-works', 'ai-showcase', 'for-schools'];
    const handler = () => {
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // stats reveal
  const statsReveal = useScrollReveal(0.3);
  const stat1 = useCountUp(17, 1000, statsReveal.visible);
  const stat2 = useCountUp(3, 800, statsReveal.visible);
  const stat3 = useCountUp(100, 1200, statsReveal.visible);

  const navGlass = scrollY > 50;

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Schools', href: '#for-schools' },
    { label: 'AI', href: '#ai-showcase' },
  ];

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: T.body, color: T.tx, overflowX: 'hidden' }}>
      {/* Injected keyframes */}
      <style>{GLOBAL_STYLES}</style>

      {/* ── 1. FIXED NAVBAR ─────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: navGlass ? 'rgba(7,9,26,0.82)' : 'transparent',
        backdropFilter: navGlass ? 'blur(16px)' : 'none',
        borderBottom: navGlass ? `1px solid ${T.bd}` : '1px solid transparent',
        transition: 'all 0.35s ease',
      }}>
        {/* Logo */}
        <a href="#hero" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎓</span>
          <span style={{
            fontFamily: T.serif, fontSize: 20, color: T.a1, letterSpacing: 0.5,
          }}>Academy Linker</span>
        </a>

        {/* Center nav */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {navLinks.map(({ label, href }) => {
            const sectionId = href.slice(1);
            const isActive = activeSection === sectionId;
            return (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: T.body, fontWeight: 700, fontSize: 14,
                  color: isActive ? T.a2 : T.tx2,
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: isActive ? `${T.a2}14` : 'transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: 0.3,
                }}
              >{label}</a>
            );
          })}
        </div>

        {/* Sign In */}
        <button
          onClick={() => navigate('/login')}
          style={{
            fontFamily: T.body, fontWeight: 700, fontSize: 14,
            color: T.a1, background: 'transparent',
            border: `1.5px solid ${T.a1}`,
            borderRadius: 10, padding: '8px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${T.a1}18`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >Sign In</button>
      </nav>

      {/* ── 2. HERO ─────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          padding: '120px 24px 80px',
          textAlign: 'center',
        }}
      >
        {/* Animated gradient blobs */}
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.a1}22 0%, transparent 70%)`,
          animation: 'blob-drift 8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.a2}1A 0%, transparent 70%)`,
          animation: 'blob-drift 10s ease-in-out 2s infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '25%',
          width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.a4}15 0%, transparent 70%)`,
          animation: 'blob-drift 12s ease-in-out 1s infinite',
          pointerEvents: 'none',
        }} />
        <DotGrid />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: `${T.a3}15`, border: `1px solid ${T.a3}44`,
          borderRadius: 100, padding: '6px 18px', marginBottom: 32,
          fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a3,
          letterSpacing: 0.5,
          animation: 'fade-up 0.5s ease forwards',
        }}>
          🏆 EduX Hackathon 2026 · Best EdTech Solution
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: T.serif,
          fontSize: 'clamp(40px, 7vw, 80px)',
          color: T.tx,
          lineHeight: 1.1,
          margin: '0 0 24px',
          maxWidth: 820,
          animation: 'fade-up 0.6s ease 0.1s both forwards',
          opacity: 0,
        }}>
          Bridging Home and School<br />
          <span style={{
            background: `linear-gradient(135deg, ${T.a1}, ${T.a4})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>in the Age of AI</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: T.body, fontSize: 18, color: T.tx2,
          maxWidth: 640, lineHeight: 1.7, margin: '0 0 40px',
          animation: 'fade-up 0.6s ease 0.2s both forwards',
          opacity: 0,
        }}>
          Academy Linker connects parents and teachers with AI-powered insights,
          real-time multilingual messaging, and personalised learning support —
          so every child can thrive.
        </p>

        {/* CTA buttons */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 80,
          animation: 'fade-up 0.6s ease 0.3s both forwards',
          opacity: 0,
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              fontFamily: T.body, fontWeight: 800, fontSize: 16,
              color: '#fff',
              background: `linear-gradient(135deg, ${T.a1}, #C0004C)`,
              border: 'none', borderRadius: 12, padding: '14px 32px',
              cursor: 'pointer',
              boxShadow: `0 4px 24px ${T.a1}55`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${T.a1}77`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px ${T.a1}55`; }}
          >Get Started →</button>

          <button
            style={{
              fontFamily: T.body, fontWeight: 800, fontSize: 16,
              color: T.tx, background: 'transparent',
              border: `1.5px solid ${T.tx3}`,
              borderRadius: 12, padding: '14px 32px',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.a2; (e.currentTarget as HTMLButtonElement).style.color = T.a2; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.tx3; (e.currentTarget as HTMLButtonElement).style.color = T.tx; }}
          >▶ Watch Demo</button>
        </div>

        {/* Floating mock UI cards */}
        <div style={{
          display: 'flex', gap: 24, justifyContent: 'center',
          flexWrap: 'wrap',
          animation: 'fade-up 0.8s ease 0.4s both forwards',
          opacity: 0,
        }}>
          {/* Card 1: Progress Report */}
          <MockAppCard title="AI Progress Report" accent={T.a2} delay={0} animKey={0}>
            <div style={{ fontFamily: T.body, fontSize: 13, color: T.tx2, marginBottom: 12 }}>
              Emma Chen · Year 7
            </div>
            <MockBar pct={88} color={T.a2} label="Mathematics" />
            <MockBar pct={74} color={T.a4} label="English" />
            <MockBar pct={91} color={T.a3} label="Science" />
            <div style={{
              marginTop: 10, fontSize: 11, color: T.a2,
              background: `${T.a2}14`, borderRadius: 6, padding: '5px 8px',
              fontFamily: T.body,
            }}>
              ✦ AI: Excelling in pattern recognition
            </div>
          </MockAppCard>

          {/* Card 2: Message thread */}
          <MockAppCard title="Parent Messaging" accent={T.a1} delay={0.3} animKey={1}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { msg: 'Great progress in maths this week!', from: 'Ms. Williams', time: '9:41 AM', mine: false },
                { msg: 'Thank you! 谢谢您的反馈 🙏', from: 'You', time: '9:44 AM', mine: true },
              ].map((m, i) => (
                <div key={i} style={{
                  background: m.mine ? `${T.a1}22` : `${T.a2}14`,
                  border: `1px solid ${m.mine ? T.a1 : T.a2}33`,
                  borderRadius: 8, padding: '7px 10px',
                }}>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: m.mine ? T.a1 : T.a2, fontWeight: 700, marginBottom: 3 }}>
                    {m.from}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 12, color: T.tx }}>{m.msg}</div>
                  <div style={{ fontFamily: T.body, fontSize: 10, color: T.tx3, marginTop: 3, textAlign: 'right' }}>{m.time}</div>
                </div>
              ))}
            </div>
          </MockAppCard>

          {/* Card 3: Announcements */}
          <MockAppCard title="School Feed" accent={T.a4} delay={0.6} animKey={2}>
            {[
              { icon: '📢', title: 'Sports Day', time: '2h ago', color: T.a3 },
              { icon: '📋', title: 'Term 2 Report Ready', time: '1d ago', color: T.a2 },
              { icon: '🌟', title: 'Emma won Art Prize', time: '2d ago', color: T.a1 },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 0',
                borderBottom: i < 2 ? `1px solid ${T.bd}` : 'none',
              }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <div>
                  <div style={{ fontFamily: T.body, fontSize: 12, color: T.tx, fontWeight: 700 }}>{a.title}</div>
                  <div style={{ fontFamily: T.body, fontSize: 10, color: T.tx3 }}>{a.time}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: a.color }} />
              </div>
            ))}
          </MockAppCard>
        </div>
      </section>

      {/* ── 3. STATS MARQUEE ────────────────────────────────── */}
      <div style={{
        background: T.bg2,
        borderTop: `1.5px solid ${T.a1}55`,
        borderBottom: `1.5px solid ${T.a1}55`,
        padding: '16px 0',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex', whiteSpace: 'nowrap',
          animation: 'marquee 22s linear infinite',
        }}>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {[
                '17 Languages',
                '3 User Roles',
                'Real-time Messaging',
                'AI Progress Reports',
                '50+ Schools',
                '10,000+ Families',
                'Instant Translation',
                'Zero Workload Added',
              ].map(item => (
                <span key={item} style={{
                  fontFamily: T.body, fontWeight: 700, fontSize: 14,
                  color: T.tx2, padding: '0 32px',
                }}>
                  <span style={{ color: T.a1, marginRight: 8 }}>✦</span>
                  {item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── 4. PROBLEM → SOLUTION ───────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div
          className="section-hidden"
          style={{
            textAlign: 'center', marginBottom: 60,
          }}
        >
          <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a1, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            The Challenge
          </div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: 0 }}>
            Why School Communication Is Broken
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {/* Problem card */}
          <div
            className="section-hidden"
            style={{
              background: T.card,
              border: '1.5px solid rgba(255,60,100,0.3)',
              borderRadius: 20, padding: 36,
              boxShadow: '0 4px 32px rgba(255,32,112,0.08)',
            }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,32,112,0.12)', border: '1px solid rgba(255,32,112,0.3)',
              borderRadius: 8, padding: '5px 14px', marginBottom: 24,
            }}>
              <span style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: '#FF4466' }}>
                ✗ The Communication Gap
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Language barriers exclude non-English families from school life',
                'One-way updates leave parents confused and disengaged',
                'No actionable guidance on how to support learning at home',
                'Teacher overload means personalised feedback rarely happens',
              ].map((pain, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#FF4466', fontWeight: 900, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>✗</span>
                  <span style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, lineHeight: 1.6 }}>{pain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution card */}
          <div
            className="section-hidden"
            style={{
              background: T.card,
              border: `1.5px solid ${T.a2}55`,
              borderRadius: 20, padding: 36,
              boxShadow: `0 4px 32px ${T.a2}12`,
            }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${T.a2}14`, border: `1px solid ${T.a2}44`,
              borderRadius: 8, padding: '5px 14px', marginBottom: 24,
            }}>
              <span style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a2 }}>
                ✓ Academy Linker Changes That
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                '17-language AI translation makes every family feel included',
                'Personalised parent updates tailored to each child\'s progress',
                'AI-generated at-home learning tips based on live performance data',
                'AI drafts reduce teacher response time by over 80%',
              ].map((sol, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: T.a2, fontWeight: 900, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, lineHeight: 1.6 }}>{sol}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURES GRID ────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', background: T.bg2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="section-hidden" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              Platform Features
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: 0 }}>
              Everything Schools Need, Nothing They Don't
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {[
              { icon: '🌏', title: 'Multilingual AI', desc: '17 languages with DeepSeek AI translation. Every family reads updates in their native language, automatically.', accent: T.a2, delay: 0 },
              { icon: '💬', title: 'Real-time Messaging', desc: 'Secure parent-teacher threads with unread badges, read receipts, and per-message AI translation.', accent: T.a1, delay: 0.05 },
              { icon: '📊', title: 'AI Progress Reports', desc: 'Weekly AI-generated academic reports with subject scores, trend charts, and personalised insights.', accent: T.a4, delay: 0.1 },
              { icon: '🎯', title: 'Teaching Suggestions', desc: 'Subject-specific, AI-generated at-home support tips based on each student\'s live performance data.', accent: T.a3, delay: 0.15 },
              { icon: '📢', title: 'Smart Class Posts', desc: 'Teachers write once. AI personalises each post for every student\'s parent automatically.', accent: T.a2, delay: 0.2 },
              { icon: '🔔', title: 'Instant Notifications', desc: 'School announcements, leave requests, and incident reporting — all in one accessible hub.', accent: T.a1, delay: 0.25 },
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="section-hidden" style={{ textAlign: 'center', marginBottom: 70 }}>
          <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Simple by Design
          </div>
          <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: 0 }}>
            How It Works
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 0, position: 'relative',
        }}>
          {[
            {
              n: '01', title: 'Teacher Posts an Update',
              desc: 'Writes once, selects target class or individual students. Takes under 60 seconds.',
              color: T.a1,
            },
            {
              n: '02', title: 'AI Personalises & Translates',
              desc: 'DeepSeek transforms it into parent-friendly language in their native tongue — instantly.',
              color: T.a2,
            },
            {
              n: '03', title: 'Parent Receives & Acts',
              desc: 'Reads actionable tips in their own language, replies directly, and tracks their child\'s progress.',
              color: T.a4,
            },
          ].map((step, i) => (
            <div
              key={step.n}
              className="section-hidden"
              style={{ position: 'relative', padding: '0 24px 0', animationDelay: `${i * 0.15}s` }}
            >
              {/* Dashed connector */}
              {i < 2 && (
                <div style={{
                  position: 'absolute', top: 28, right: -12,
                  width: 24, height: 2,
                  borderTop: `2px dashed ${T.tx3}`,
                  zIndex: 1,
                }} />
              )}
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: '50%',
                background: `${step.color}22`,
                border: `2px solid ${step.color}`,
                fontFamily: T.serif, fontSize: 20, color: step.color,
                marginBottom: 20,
                boxShadow: `0 0 24px ${step.color}44`,
              }}>{step.n}</div>
              <h3 style={{ fontFamily: T.serif, fontSize: 22, color: T.tx, margin: '0 0 12px' }}>
                {step.title}
              </h3>
              <p style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, lineHeight: 1.7, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. AI SHOWCASE ──────────────────────────────────── */}
      <section
        id="ai-showcase"
        style={{
          padding: '100px 24px',
          background: `linear-gradient(160deg, ${T.sb} 0%, #0A0820 50%, ${T.sb} 100%)`,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Accent glow */}
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: 400, height: 400,
          background: `radial-gradient(circle, ${T.a4}18 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '5%',
          width: 300, height: 300,
          background: `radial-gradient(circle, ${T.a2}14 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="section-hidden" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a4, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              AI at the Core
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: '0 0 16px' }}>
              Powered by DeepSeek AI
            </h2>
            <p style={{ fontFamily: T.body, fontSize: 16, color: T.tx2, maxWidth: 560, margin: '0 auto' }}>
              Every feature is augmented by cutting-edge AI — not as a gimmick, but as a genuine force multiplier for teachers and families.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                icon: '✦', title: 'Personalisation',
                desc: 'Tailors every message to the individual student\'s performance, name, and context — no two reports are the same.',
                color: T.a1,
              },
              {
                icon: '✦', title: 'Translation',
                desc: 'Real-time translation into 17 languages — messages, reports, subjects, and the entire UI.',
                color: T.a2,
              },
              {
                icon: '✦', title: 'Report Generation',
                desc: 'Full markdown academic reports generated per student per term, intelligently cached per language.',
                color: T.a4,
              },
              {
                icon: '✦', title: 'Smart Drafts',
                desc: 'AI-suggested teacher replies reduce response time by 80%, keeping every parent engagement alive.',
                color: T.a3,
              },
            ].map((cap, i) => (
              <div
                key={cap.title}
                className="section-hidden"
                style={{
                  background: `${T.card}cc`,
                  border: `1px solid ${cap.color}33`,
                  borderRadius: 16, padding: '28px 24px',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.3s ease',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{
                  fontFamily: T.serif, fontSize: 24, color: cap.color,
                  marginBottom: 12,
                }}>{cap.icon}</div>
                <h3 style={{ fontFamily: T.serif, fontSize: 20, color: T.tx, margin: '0 0 10px' }}>
                  {cap.title}
                </h3>
                <p style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, lineHeight: 1.6, margin: 0 }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. FOR EVERY FAMILY ─────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <DotGrid />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div className="section-hidden">
            <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a2, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              No Family Left Behind
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: '0 0 24px' }}>
              Communication Without Borders
            </h2>
          </div>

          {/* Language chips */}
          <div className="section-hidden" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 40 }}>
            {[
              { label: '中文', delay: '0s' },
              { label: 'Español', delay: '0.3s' },
              { label: 'हिंदी', delay: '0.6s' },
              { label: 'عربي', delay: '0.9s' },
              { label: '日本語', delay: '1.2s' },
              { label: 'Bahasa', delay: '1.5s' },
            ].map(chip => (
              <span
                key={chip.label}
                style={{
                  fontFamily: T.body, fontWeight: 700, fontSize: 16,
                  color: T.a2,
                  background: `${T.a2}14`,
                  border: `1px solid ${T.a2}44`,
                  borderRadius: 100, padding: '10px 22px',
                  animation: `chip-float 2.5s ease-in-out ${chip.delay} infinite`,
                  display: 'inline-block',
                }}
              >{chip.label}</span>
            ))}
          </div>

          <p className="section-hidden" style={{
            fontFamily: T.body, fontSize: 16, color: T.tx2,
            lineHeight: 1.8, marginBottom: 40,
          }}>
            Academy Linker auto-detects and translates all communication — reports, messages,
            notifications, and the entire UI — into 17 languages instantly.
          </p>

          <div className="section-hidden" style={{
            display: 'inline-block',
            background: T.card,
            border: `1.5px solid ${T.a4}44`,
            borderRadius: 16, padding: '24px 40px',
            boxShadow: `0 4px 32px ${T.a4}22`,
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 'clamp(48px, 8vw, 72px)', color: T.a4, lineHeight: 1 }}>
              94%
            </div>
            <div style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, marginTop: 8 }}>
              of EAL/D families reported better understanding<br />of their child's progress
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FOR SCHOOLS ──────────────────────────────────── */}
      <section id="for-schools" style={{ padding: '100px 24px', background: T.bg2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="section-hidden" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 13, color: T.a1, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
              School-Ready
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 'clamp(28px, 4vw, 48px)', color: T.tx, margin: 0 }}>
              Trusted by progressive schools<br />across Australia
            </h2>
          </div>

          <div
            ref={statsReveal.ref}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            {[
              { value: stat1, suffix: '', label: 'Languages Supported', icon: '🌏', color: T.a2 },
              { value: stat2, suffix: '', label: 'Role-based Portals\nParent · Teacher · Admin', icon: '👥', color: T.a1 },
              { value: stat3, suffix: '%', label: 'Communication Coverage', icon: '✓', color: T.a4 },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: T.card,
                  border: `1.5px solid ${stat.color}33`,
                  borderRadius: 20, padding: '36px',
                  textAlign: 'center',
                  boxShadow: `0 4px 32px ${stat.color}14`,
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>{stat.icon}</div>
                <div style={{ fontFamily: T.serif, fontSize: 64, color: stat.color, lineHeight: 1 }}>
                  {stat.value}{stat.suffix}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 14, color: T.tx2, marginTop: 10, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA ───────────────────────────────────── */}
      <section style={{
        padding: '120px 24px',
        background: `linear-gradient(135deg, ${T.a1}CC 0%, #8B1DB8 50%, ${T.a4} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'gradient-shift 6s ease infinite',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(7,9,26,0.35)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <h2 className="section-hidden" style={{
            fontFamily: T.serif, fontSize: 'clamp(32px, 5vw, 56px)',
            color: '#fff', margin: '0 0 20px', lineHeight: 1.15,
          }}>
            Ready to connect home and school?
          </h2>
          <p className="section-hidden" style={{
            fontFamily: T.body, fontSize: 17, color: 'rgba(255,255,255,0.8)',
            margin: '0 0 40px', lineHeight: 1.7,
          }}>
            Join hundreds of families and teachers already experiencing the future of school communication.
          </p>
          <div className="section-hidden" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                fontFamily: T.body, fontWeight: 800, fontSize: 16,
                color: T.a1, background: '#fff',
                border: 'none', borderRadius: 12, padding: '14px 36px',
                cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >Start Free Trial</button>
            <button
              style={{
                fontFamily: T.body, fontWeight: 800, fontSize: 16,
                color: '#fff', background: 'transparent',
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: 12, padding: '14px 36px',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
            >Request Demo</button>
          </div>
          <p style={{ fontFamily: T.body, fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Built for EduX Hackathon 2026 · CurricuLLM Challenge
          </p>
        </div>
      </section>

      {/* ── 11. FOOTER ──────────────────────────────────────── */}
      <footer style={{
        background: T.sb, borderTop: `1px solid ${T.bd}`,
        padding: '60px 40px 32px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 48, marginBottom: 48,
          }}>
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🎓</span>
                <span style={{ fontFamily: T.serif, fontSize: 18, color: T.a1 }}>Academy Linker</span>
              </div>
              <p style={{ fontFamily: T.body, fontSize: 13, color: T.tx3, lineHeight: 1.7, margin: 0 }}>
                AI-powered school communication for the modern world. Bridging home and school, one message at a time.
              </p>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 12, color: T.tx2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Product</div>
              {['Features', 'For Parents', 'For Teachers', 'For Admins', 'AI Translation'].map(link => (
                <div key={link} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontFamily: T.body, fontSize: 14, color: T.tx3, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = T.tx; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = T.tx3; }}
                  >{link}</a>
                </div>
              ))}
            </div>

            {/* For Schools */}
            <div>
              <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 12, color: T.tx2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>For Schools</div>
              {['Book a Demo', 'Pricing', 'Case Studies', 'Onboarding', 'Security'].map(link => (
                <div key={link} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontFamily: T.body, fontSize: 14, color: T.tx3, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = T.tx; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = T.tx3; }}
                  >{link}</a>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div style={{ fontFamily: T.body, fontWeight: 700, fontSize: 12, color: T.tx2, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
              {['hello@academylinker.edu', 'EduX Hackathon 2026', 'Cambridge, UK', 'Support Portal'].map(item => (
                <div key={item} style={{ marginBottom: 10 }}>
                  <span style={{ fontFamily: T.body, fontSize: 14, color: T.tx3 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: `1px solid ${T.bd}`,
            paddingTop: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <span style={{ fontFamily: T.body, fontSize: 13, color: T.tx3 }}>
              © 2026 Academy Linker · Built for EduX Hackathon
            </span>
            <span style={{
              fontFamily: T.body, fontSize: 12, color: T.tx3,
              background: `${T.a1}14`, border: `1px solid ${T.a1}33`,
              borderRadius: 100, padding: '4px 12px',
            }}>
              Powered by DeepSeek AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
