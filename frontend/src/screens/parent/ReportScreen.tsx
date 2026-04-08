// ============================================================
// ReportScreen — Rich AI progress report with PDF download
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi } from '@/lib/api';
import type { Report, ReportDetail } from '@/types/api';
import { translateBatch, useTranslatedText } from '@/lib/translate';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Simple markdown renderer ──────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--tx)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

function MarkdownView({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { nodes.push(<div key={i} style={{ height: 6 }} />); i++; continue; }
    if (line.startsWith('# '))  { nodes.push(<h1 key={i} style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', margin: '20px 0 8px' }}>{line.slice(2)}</h1>); i++; continue; }
    if (line.startsWith('## ')) { nodes.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', borderBottom: '2px solid var(--bd)', paddingBottom: 5, margin: '20px 0 8px' }}>{line.slice(3)}</h2>); i++; continue; }
    if (line.startsWith('### ')){ nodes.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', margin: '14px 0 4px' }}>{line.slice(4)}</h3>); i++; continue; }
    if (line.match(/^---+$/))   { nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--bd)', margin: '16px 0' }} />); i++; continue; }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} style={{ marginBottom: 3 }}>{parseInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} style={{ paddingLeft: 18, margin: '6px 0', fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7 }}>{items}</ul>);
      continue;
    }
    if (/^\d+\./.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\./.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 4 }}>{parseInline(lines[i].replace(/^\d+\.\s*/, ''))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} style={{ paddingLeft: 20, margin: '6px 0', fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7 }}>{items}</ol>);
      continue;
    }
    nodes.push(<p key={i} style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75, margin: '4px 0' }}>{parseInline(line)}</p>);
    i++;
  }
  return <div>{nodes}</div>;
}

// ── PDF helper ────────────────────────────────────────────────

function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false, inOl = false;
  for (const line of lines) {
    const isBullet = line.startsWith('- ') || line.startsWith('* ');
    const isNum    = /^\d+\./.test(line);
    if (!isBullet && inUl) { out.push('</ul>'); inUl = false; }
    if (!isNum   && inOl)  { out.push('</ol>'); inOl = false; }
    if (!line.trim())        { out.push('<br>'); continue; }
    if (line.match(/^---+$/)) { out.push('<hr>'); continue; }
    if (line.startsWith('# '))  { out.push(`<h1>${esc(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('## ')) { out.push(`<h2>${esc(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('### ')){ out.push(`<h3>${esc(line.slice(4))}</h3>`); continue; }
    if (isBullet) { if (!inUl) { out.push('<ul>'); inUl = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (isNum)    { if (!inOl) { out.push('<ol>'); inOl = true; } out.push(`<li>${inline(line.replace(/^\d+\.\s*/, ''))}</li>`); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inUl) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
}

// ── Main screen ───────────────────────────────────────────────

export function ReportScreen() {
  const { sid } = useParams<{ sid: string }>();
  const { language, teacherNotes } = useApp();
  const studentNotes = teacherNotes[sid ?? ''] ?? [];

  const txTitle       = useTranslatedText('Progress Reports', language);
  const txSectionHdr  = useTranslatedText('Reports', language);
  const txTerm        = useTranslatedText('Term', language);
  const txGenerating  = useTranslatedText('Generating full report…', language);
  const txDownload    = useTranslatedText('Download PDF', language);
  const txEmail       = useTranslatedText('Email to me', language);
  const txSent        = useTranslatedText('✓ Sent!', language);

  const [reports, setReports]             = useState<Report[]>([]);
  const [selectedUuid, setSelectedUuid]   = useState('');
  const [detail, setDetail]               = useState<ReportDetail | null>(null);
  const [readIds, setReadIds]             = useState<Set<string>>(new Set());
  const [emailSent, setEmailSent]         = useState(false);

  // Rich AI content cache: `${reportUuid}:${language}` → markdown
  const [richContent, setRichContent]     = useState<Record<string, string>>({});
  const [generating, setGenerating]       = useState(false);

  // ── Fetch reports list ──────────────────────────────────────
  useEffect(() => {
    if (!sid) return;
    parentApi.getReports(sid).then(res => {
      if (res.data.length > 0) {
        setReports(res.data);
        setSelectedUuid(res.data[0].uuid);
        setReadIds(new Set(res.data.filter(r => r.is_read).map(r => r.uuid)));
      }
    }).catch(() => {});
  }, [sid]);

  // ── Fetch report detail when selection changes ──────────────
  useEffect(() => {
    if (!sid || !selectedUuid) return;
    parentApi.getReport(sid, selectedUuid).then(res => {
      setDetail(res.data);
    }).catch(() => {
      const found = reports.find(r => r.uuid === selectedUuid);
      if (found) setDetail({ ...found, content_markdown: '', student: { uuid: sid, display_name: '' } });
    });
  }, [sid, selectedUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate rich AI report ─────────────────────────────────
  const cacheKey = `${selectedUuid}:${language}`;
  useEffect(() => {
    if (!selectedUuid || richContent[cacheKey]) return;
    setGenerating(true);
    parentApi.generateReport(selectedUuid, language, studentNotes.length > 0 ? studentNotes : undefined)
      .then(res => setRichContent(prev => ({ ...prev, [cacheKey]: res.data.content_markdown })))
      .catch(() => {/* generation failed — don't cache, let user see static fallback */})
      .finally(() => setGenerating(false));
  }, [selectedUuid, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select report: mark as read ─────────────────────────────
  const handleSelect = useCallback((uuid: string) => {
    setSelectedUuid(uuid);
    if (!readIds.has(uuid)) {
      setReadIds(prev => new Set([...prev, uuid]));
      parentApi.markReportRead(uuid).catch(() => {});
    }
  }, [readIds]);

  // Mark initial report as read on first load
  useEffect(() => {
    if (selectedUuid) handleSelect(selectedUuid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Translated report list ──────────────────────────────────
  const [txReports, setTxReports] = useState(reports);
  useEffect(() => {
    setTxReports(reports);
    if (language === 'en') return;
    translateBatch(reports.map(r => r.title), language).then(results => {
      setTxReports(reports.map((r, i) => ({ ...r, title: results[i] || r.title })));
    });
  }, [language, reports]);

  const txSubtitle = useTranslatedText(
    `Weekly updates on ${detail?.student?.display_name ?? ''}'s academic progress`,
    language,
  );

  // ── PDF download ────────────────────────────────────────────
  const handlePDF = () => {
    const content = richContent[cacheKey] || detail?.content_markdown || '';
    const reportTitle = txReports.find(r => r.uuid === selectedUuid)?.title ?? detail?.title ?? '';
    const dateStr = detail ? formatDate(detail.created_at) : '';
    const studentName = detail?.student?.display_name ?? '';

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; color: #2A3560; line-height: 1.85; font-size: 14px; padding: 0 20px; }
    .report-header { border-bottom: 3px solid #E8614E; padding-bottom: 18px; margin-bottom: 28px; }
    .report-header h1 { font-size: 28px; margin: 0 0 6px; color: #2A3560; }
    .report-header .meta { color: #7A6A8C; font-size: 12px; font-style: italic; }
    h2 { font-size: 18px; color: #2A3560; border-bottom: 1.5px solid #E8614E; padding-bottom: 5px; margin-top: 28px; }
    h3 { font-size: 15px; color: #4A5568; margin-top: 18px; }
    p  { color: #4A5568; margin: 6px 0; }
    ul, ol { color: #4A5568; padding-left: 22px; }
    li { margin: 4px 0; }
    strong { color: #2A3560; }
    hr { border: none; border-top: 1px solid #E0D0C0; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #E0D0C0; font-size: 11px; color: #B8A8C8; text-align: center; }
    @media print { body { margin: 20mm 25mm; } .footer { position: fixed; bottom: 10mm; left: 0; right: 0; } }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${reportTitle}</h1>
    <div class="meta">Westside Academy &nbsp;·&nbsp; ${studentName} &nbsp;·&nbsp; ${dateStr}</div>
  </div>
  ${mdToHtml(content)}
  <div class="footer">Generated by Academy Linker &nbsp;·&nbsp; Westside Academy</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const handleEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const currentContent = richContent[cacheKey] || '';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>{txTitle}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{txSubtitle}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        {/* ── Report list ── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {txSectionHdr}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {txReports.map(report => (
              <div
                key={report.uuid}
                className="card-sm"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedUuid === report.uuid ? 'var(--a1)' : 'var(--bd)',
                  background: selectedUuid === report.uuid ? 'rgba(232,97,78,0.04)' : 'var(--card)',
                }}
                onClick={() => handleSelect(report.uuid)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{report.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{txTerm} {report.term}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>{formatDate(report.created_at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Report detail ── */}
        <div className="card" style={{ minHeight: 500 }}>
          {/* Report header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
            <div>
              <div className="font-serif" style={{ fontSize: 20, color: 'var(--tx)', marginBottom: 4 }}>
                {txReports.find(r => r.uuid === selectedUuid)?.title ?? detail?.title ?? ''}
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{detail ? formatDate(detail.created_at) : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {generating && (
                <span style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>{txGenerating}</span>
              )}
              <button
                className="btn-secondary"
                onClick={handlePDF}
                disabled={!currentContent}
                style={{ opacity: currentContent ? 1 : 0.4, fontSize: 12 }}
              >
                ⬇ {txDownload}
              </button>
              <button
                className="btn-secondary"
                onClick={handleEmail}
                style={{ color: emailSent ? 'var(--a2)' : undefined, fontSize: 12 }}
              >
                {emailSent ? txSent : `✉ ${txEmail}`}
              </button>
            </div>
          </div>

          {/* Score pills */}
          {detail?.subjects && detail.subjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {detail.subjects.map(sub => (
                <div key={sub.subject_uuid} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: sub.subject_color + '15', border: `1px solid ${sub.subject_color}30` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sub.subject_color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600 }}>{sub.subject_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sub.subject_color }}>{sub.score}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Generated content or skeleton */}
          {generating && !currentContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
              {[80, 60, 90, 55, 75].map((w, i) => (
                <div key={i} style={{ height: 14, borderRadius: 6, background: 'var(--bg2)', width: `${w}%`, opacity: 0.6 + i * 0.05 }} />
              ))}
              <div style={{ height: 14, borderRadius: 6, background: 'var(--bg2)', width: '45%', opacity: 0.5 }} />
              <div style={{ marginTop: 8, height: 2, background: 'var(--bd)', borderRadius: 1 }} />
              {[70, 85, 50, 95].map((w, i) => (
                <div key={`b${i}`} style={{ height: 13, borderRadius: 6, background: 'var(--bg2)', width: `${w}%`, opacity: 0.5 }} />
              ))}
            </div>
          ) : currentContent ? (
            <MarkdownView text={currentContent} />
          ) : (
            /* Fallback to subject list while generating */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {detail?.subjects?.map(sub => (
                <div key={sub.subject_uuid} style={{ borderLeft: `4px solid ${sub.subject_color}`, paddingLeft: 16, paddingTop: 2, paddingBottom: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{sub.subject_name}</div>
                    {sub.score !== undefined && (
                      <span className="badge" style={{ background: sub.subject_color + '18', color: sub.subject_color, fontSize: 12, fontWeight: 700 }}>{sub.score}%</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>{sub.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
