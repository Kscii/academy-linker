// ============================================================
// Teacher TagsScreen — manage available and private tags
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { teacher as teacherApi, getApiErrorMessage } from '@/lib/api';
import type { PostTag } from '@/types/api';

type ScopeFilter = 'all' | 'system' | 'teacher_private';

const EMPTY_FORM = { uuid: '', name: '' };

export function TeacherTagsScreen() {
  const { t } = useTranslation('portal');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [tags, setTags] = useState<PostTag[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTags = async (nextScope = scope) => {
    const res = await teacherApi.getTags(nextScope);
    setTags(res.data);
  };

  useEffect(() => {
    void loadTags();
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
  };

  const openEdit = (tag: PostTag) => {
    setForm({ uuid: tag.uuid, name: tag.name });
    setEditing(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t('tagNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing && form.uuid) {
        await teacherApi.updateTag(form.uuid, form.name.trim());
      } else {
        await teacherApi.createTag(form.name.trim());
      }
      openCreate();
      await loadTags();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('failedSaveTag')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagUuid: string) => {
    await teacherApi.deleteTag(tagUuid);
    await loadTags();
    if (form.uuid === tagUuid) openCreate();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('tagsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('tagsCount', { count: tags.length })}</div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={openCreate}>
          {t('newPrivateTag')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
          <select className="input-field" value={scope} onChange={e => setScope(e.target.value as ScopeFilter)}>
            <option value="all">{t('allTags')}</option>
            <option value="system">{t('systemTagsTitle')}</option>
            <option value="teacher_private">{t('privateTags')}</option>
          </select>
          <div style={{ fontSize: 12, color: 'var(--tx3)', display: 'flex', alignItems: 'center' }}>
            {t('systemTagsHint')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('availableTags')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tags.map(tag => (
              <div key={tag.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{tag.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                    {tag.scope} · {t('parentSelectable')}: {tag.is_selectable_by_parent ? t('yes') : t('no')} · {t('teacherSelectable')}: {tag.is_selectable_by_teacher ? t('yes') : t('no')}
                  </div>
                </div>
                {tag.scope === 'teacher_private' && (
                  <>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => openEdit(tag)}>
                      {t('common:edit')}
                    </button>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--warn)' }} onClick={() => void handleDelete(tag.uuid)}>
                      {t('common:delete')}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {editing ? t('editPrivateTag') : t('createPrivateTag')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-field" placeholder={t('tagName')} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            {error && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common:loading') : editing ? t('saveChanges') : t('createTag')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
