// ============================================================
// ResourcesScreen — 2×2 grid of resource cards
// ============================================================

const RESOURCES = [
  {
    title: 'Academic Support',
    description: 'Access tutoring schedules, study guides, and exam preparation materials for all subjects.',
    icon: '📚',
    color: 'var(--a1)',
    items: ['Khan Academy links', 'Study timetable templates', 'Exam revision guides', 'Homework help portal'],
  },
  {
    title: 'School Policies',
    description: 'Important school policies including attendance, uniform, and behaviour guidelines.',
    icon: '📋',
    color: 'var(--a2)',
    items: ['Attendance policy', 'Uniform requirements', 'Anti-bullying policy', 'Digital device policy'],
  },
  {
    title: 'Wellbeing Support',
    description: 'Resources to support your child\'s mental health and social-emotional wellbeing.',
    icon: '💚',
    color: 'var(--a3)',
    items: ['School counsellor contacts', 'Wellbeing programs', 'Parent resources', 'Crisis support numbers'],
  },
  {
    title: 'Events & Calendar',
    description: 'Stay up to date with school events, excursions, and important term dates.',
    icon: '📅',
    color: 'var(--a4)',
    items: ['Term dates 2025', 'Upcoming excursions', 'Sports carnival schedule', 'Parent-teacher nights'],
  },
];

export function ResourcesScreen() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Resources
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Helpful materials and links for parents and students
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {RESOURCES.map(resource => (
          <div
            key={resource.title}
            className="card"
            style={{ borderLeft: `4px solid ${resource.color}` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: resource.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {resource.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
                {resource.title}
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 14 }}>
              {resource.description}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {resource.items.map(item => (
                <div
                  key={item}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--bg2)', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: resource.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{item}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tx3)' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
