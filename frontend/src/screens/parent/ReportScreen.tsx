// ============================================================
// ReportScreen — Rich AI progress report with PDF download
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { TtsButton } from '@/components/TtsButton';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi, translations } from '@/lib/api';
import type { PaginationMeta, Report, ParentReportDetail } from '@/types/api';

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
  const { t } = useTranslation('app');
  const { sid } = useParams<{ sid: string }>();
  const { language } = useApp();

  const txTitle       = t('nav:reports');
  const txSectionHdr  = t('parentReports.section');
  const txDownload    = t('parentReports.downloadPdf');
  const txEmail       = t('parentReports.emailToMe');
  const txSent        = t('parentReports.sent');
  const txNoReports   = t('parentReports.empty');

  const [reports, setReports]             = useState<Report[]>([]);
  const [selectedUuid, setSelectedUuid]   = useState('');
  const [detail, setDetail]               = useState<ParentReportDetail | null>(null);
  const [readIds, setReadIds]             = useState<Set<string>>(new Set());
  const [emailSent, setEmailSent]         = useState(false);
  const [page, setPage]                   = useState(1);
  const [status, setStatus]               = useState<'active' | 'archived' | 'all'>('active');
  const [readState, setReadState]         = useState<'all' | 'read' | 'unread'>('all');
  const [sort, setSort]                   = useState<'created_at_desc' | 'created_at_asc'>('created_at_desc');
  const [meta, setMeta]                   = useState<PaginationMeta>({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [showOriginal, setShowOriginal]   = useState(false);
  const [resolvingTranslation, setResolvingTranslation] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // ── Fetch reports list ──────────────────────────────────────
  useEffect(() => {
    if (!sid) return;
    parentApi.getReports(sid, { page, page_size: 20, status, read_state: readState, sort }).then(res => {
      setReports(res.data);
      setMeta(res.meta);
      setSelectedUuid(prev => (res.data.some(r => r.uuid === prev) ? prev : res.data[0]?.uuid ?? ''));
      setReadIds(new Set(res.data.filter(r => r.is_read).map(r => r.uuid)));
    }).catch(() => {});
  }, [page, readState, sid, sort, status]);

  // ── Fetch report detail when selection changes ──────────────
  useEffect(() => {
    if (!sid || !selectedUuid) return;
    parentApi.getReport(sid, selectedUuid).then(res => {
      setDetail(res.data);
      setShowOriginal(false);
    }).catch(() => {
      const found = reports.find(r => r.uuid === selectedUuid);
      if (found) {
        setDetail({
          ...found,
          display_content_markdown: '',
          original_content_markdown: '',
          translated_content_markdown: null,
          display_language: found.translation.display_language,
          original_language: found.translation.original_language,
          translated_language: found.translation.translated_language,
          translation_status: found.translation.translation_status,
          translated_at: found.translation.translated_at,
        });
      }
    });
  }, [reports, sid, selectedUuid]);

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

  const txSubtitle = t('parentReports.subtitle');

  // ── PDF download ────────────────────────────────────────────
  const handlePDF = () => {
    const content = showOriginal ? (detail?.original_content_markdown || '') : (detail?.display_content_markdown || '');
    const reportTitle = reports.find(r => r.uuid === selectedUuid)?.title ?? detail?.title ?? '';
    const dateStr = detail ? formatDate(detail.created_at) : '';
    const studentName = sid ?? '';

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

  const currentContent = detail?.display_content_markdown ?? '';
  const resolvedContent = showOriginal ? (detail?.original_content_markdown ?? '') : currentContent;

  const toggleTranslation = async () => {
    if (!detail || detail.original_language === language) return;
    if (detail.translated_content_markdown || detail.translation_status === 'completed') {
      setShowOriginal(prev => !prev);
      return;
    }
    setResolvingTranslation(true);
    try {
      const res = await translations.resolve({ resource_type: 'report', resource_uuid: detail.uuid });
      setDetail(prev => prev ? ({
        ...prev,
        display_content_markdown: res.data.display_content_markdown,
        translated_content_markdown: res.data.translated_content_markdown,
        display_language: res.data.display_language,
        translated_language: res.data.translated_language,
        translation_status: res.data.translation_status,
        translated_at: res.data.translated_at,
      }) : prev);
      setShowOriginal(false);
    } finally {
      setResolvingTranslation(false);
    }
  };

  const toggleArchive = async () => {
    if (!detail || archiving) return;
    setArchiving(true);
    try {
      if (detail.is_archived) {
        await parentApi.unarchiveReport(detail.uuid);
      } else {
        await parentApi.archiveReport(detail.uuid);
      }
      if (!sid) return;
      const [reportsRes, detailRes] = await Promise.all([
        parentApi.getReports(sid, { page, page_size: 20, status, read_state: readState, sort }),
        parentApi.getReport(sid, detail.uuid),
      ]);
      setReports(reportsRes.data);
      setMeta(reportsRes.meta);
      setDetail(detailRes.data);
    } finally {
      setArchiving(false);
    }
  };

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
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <select className="input-field" value={status} onChange={e => { setPage(1); setStatus(e.target.value as typeof status); }}>
              <option value="active">{t('parentReports.statusActive')}</option>
              <option value="archived">{t('parentReports.statusArchived')}</option>
              <option value="all">{t('parentReports.statusAll')}</option>
            </select>
            <select className="input-field" value={readState} onChange={e => { setPage(1); setReadState(e.target.value as typeof readState); }}>
              <option value="all">{t('parentReports.readAll')}</option>
              <option value="read">{t('parentReports.readRead')}</option>
              <option value="unread">{t('parentReports.readUnread')}</option>
            </select>
            <select className="input-field" value={sort} onChange={e => { setPage(1); setSort(e.target.value as typeof sort); }}>
              <option value="created_at_desc">{t('parentReports.sortNewest')}</option>
              <option value="created_at_asc">{t('parentReports.sortOldest')}</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.map(report => (
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
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                    {report.period_start ? report.period_start.slice(0, 10) : formatDate(report.created_at)}
                  </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {!report.is_read && <span className="badge" style={{ fontSize: 10 }}>{t('parentReports.unreadBadge')}</span>}
                  {report.is_archived && <span className="badge" style={{ fontSize: 10 }}>{t('parentReports.archivedBadge')}</span>}
                  {report.subject && <span className="badge" style={{ fontSize: 10 }}>{report.subject.name}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>{formatDate(report.created_at)}</div>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>{txNoReports}</div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
              {t('actions.previous')}
            </button>
            <div style={{ fontSize: 12, color: 'var(--tx3)', alignSelf: 'center' }}>
              {t('common.pageStatus', { page: meta.page, totalPages: Math.max(meta.total_pages, 1) })}
            </div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
              {t('actions.next')}
            </button>
          </div>
        </div>

        {/* ── Report detail ── */}
        <div className="card" style={{ minHeight: 500 }}>
          {/* Report header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
            <div>
              <div className="font-serif" style={{ fontSize: 20, color: 'var(--tx)', marginBottom: 4 }}>
                {reports.find(r => r.uuid === selectedUuid)?.title ?? detail?.title ?? ''}
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{detail ? formatDate(detail.created_at) : ''}</div>
              {detail && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="badge" style={{ fontSize: 10 }}>{detail.report_type}</span>
                  <span className="badge" style={{ fontSize: 10 }}>{detail.source_type}</span>
                  <span className="badge" style={{ fontSize: 10 }}>{detail.is_read ? t('parentReports.readBadge') : t('parentReports.unreadBadge')}</span>
                  {detail.is_archived && <span className="badge" style={{ fontSize: 10 }}>{t('parentReports.archivedBadge')}</span>}
                  <span className="badge" style={{ fontSize: 10 }}>{detail.display_language}</span>
                  {detail.translated_language && <span className="badge" style={{ fontSize: 10 }}>{detail.translated_language}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {detail ? <TtsButton resourceType="report" resourceUuid={detail.uuid} /> : null}
              {detail?.original_language !== language && (
                <button
                  className="btn-secondary"
                  onClick={() => void toggleTranslation()}
                  disabled={resolvingTranslation}
                  style={{ fontSize: 12 }}
                >
                  {resolvingTranslation ? '…' : showOriginal ? t('actions.showTranslation') : ((detail?.translated_content_markdown || detail?.display_language !== detail?.original_language) ? t('actions.showOriginal') : t('actions.translate'))}
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={handlePDF}
                disabled={!resolvedContent}
                style={{ opacity: resolvedContent ? 1 : 0.4, fontSize: 12 }}
              >
                ⬇ {txDownload}
              </button>
              <button className="btn-secondary" onClick={handleEmail} style={{ color: emailSent ? 'var(--a2)' : undefined, fontSize: 12 }}>
                {emailSent ? txSent : `✉ ${txEmail}`}
              </button>
              {detail && (
                <button className="btn-secondary" onClick={() => void toggleArchive()} disabled={archiving} style={{ fontSize: 12 }}>
                  {archiving ? '…' : detail.is_archived ? t('actions.unarchive') : t('actions.archive')}
                </button>
              )}
            </div>
          </div>

          {/* Subject chip */}
          {detail?.subject && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg2)', color: 'var(--tx2)', fontWeight: 600 }}>
                {detail.subject.name}{detail.subject.code ? ` · ${detail.subject.code}` : ''}
              </span>
            </div>
          )}

          {detail && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 12, color: 'var(--tx3)' }}>
              {detail.published_at && <span>{t('parentReports.publishedAt', { date: formatDate(detail.published_at) })}</span>}
              {(detail.period_start || detail.period_end) && (
                <span>
                  {t('parentReports.periodRange', {
                    start: detail.period_start ? formatDate(detail.period_start) : t('common.notAvailable'),
                    end: detail.period_end ? formatDate(detail.period_end) : t('common.notAvailable'),
                  })}
                </span>
              )}
              {detail.read_at && <span>{t('parentReports.readAt', { date: formatDate(detail.read_at) })}</span>}
              {detail.archived_at && <span>{t('parentReports.archivedAt', { date: formatDate(detail.archived_at) })}</span>}
              {detail.translated_at && <span>{t('parentReports.translatedAt', { date: formatDate(detail.translated_at) })}</span>}
            </div>
          )}

          {/* Generated content or skeleton */}
          {!currentContent && !detail ? (
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
          ) : resolvedContent ? (
            <MarkdownView text={resolvedContent} />
          ) : (
            <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>{t('parentReports.noContent')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
