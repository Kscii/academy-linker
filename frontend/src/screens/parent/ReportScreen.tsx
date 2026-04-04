// ============================================================
// ReportScreen — Weekly report display with subject sections,
// translate button, email button
// ============================================================

import { useState } from 'react';
import { mockReports, mockReportDetail } from '@/lib/mock-data';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function ReportScreen() {
  const [selectedReportUuid, setSelectedReportUuid] = useState(mockReports[0].uuid);
  const [translated, setTranslated] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const selectedReport = selectedReportUuid === mockReportDetail.uuid
    ? mockReportDetail
    : { ...mockReports.find(r => r.uuid === selectedReportUuid)!, content_markdown: '', student: { uuid: 'student-001', display_name: 'Emily Wei' } };

  const handleEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Progress Reports
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Weekly updates on Emily's academic progress
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Report list */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Reports
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mockReports.map(report => (
              <div
                key={report.uuid}
                className="card-sm"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedReportUuid === report.uuid ? 'var(--a1)' : 'var(--bd)',
                  background: selectedReportUuid === report.uuid ? 'rgba(232,97,78,0.04)' : 'var(--card)',
                }}
                onClick={() => setSelectedReportUuid(report.uuid)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{report.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                      Term {report.term}
                    </div>
                  </div>
                  {!report.is_read && (
                    <span
                      className="badge"
                      style={{ background: 'var(--a1)', color: '#fff', fontSize: 10 }}
                    >
                      New
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>
                  {formatDate(report.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report detail */}
        <div>
          <div className="card">
            {/* Report header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="font-serif" style={{ fontSize: 20, color: 'var(--tx)', marginBottom: 4 }}>
                  {selectedReport.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                  {formatDate(selectedReport.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setTranslated(t => !t)}
                >
                  {translated ? '🌐 Original' : '🌐 Translate'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleEmail}
                  style={{ color: emailSent ? 'var(--a2)' : undefined }}
                >
                  {emailSent ? '✓ Sent!' : '✉ Email to me'}
                </button>
              </div>
            </div>

            {translated && (
              <div style={{
                background: 'rgba(61,182,168,0.08)', border: '1px solid rgba(61,182,168,0.2)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--a2)',
              }}>
                Translation active (Chinese · 中文). In production this would call a translation API.
              </div>
            )}

            {/* Subject sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedReport.subjects.map(sub => (
                <div
                  key={sub.subject_uuid}
                  style={{
                    borderLeft: `4px solid ${sub.subject_color}`,
                    paddingLeft: 16, paddingTop: 2, paddingBottom: 2,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                      {sub.subject_name}
                    </div>
                    {sub.score !== undefined && (
                      <span
                        className="badge"
                        style={{
                          background: sub.subject_color + '18',
                          color: sub.subject_color,
                          fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {sub.score}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>
                    {sub.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
