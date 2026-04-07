// ============================================================
// Teacher TagsScreen — manage available and private tags
// ============================================================

import { useEffect, useState } from 'react';
import { teacher as teacherApi } from '@/lib/api';
import type { PostTag } from '@/types/api';

type ScopeFilter = 'all' | 'system' | 'teacher_private';

const EMPTY_FORM = { uuid: '', name: '' };

export function TeacherTagsScreen() {
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
      setError('Tag name is required.');
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
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to save tag.');
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
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Tags</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{tags.length} available tag{tags.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={openCreate}>
          New Private Tag
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
          <select className="input-field" value={scope} onChange={e => setScope(e.target.value as ScopeFilter)}>
            <option value="all">All Tags</option>
            <option value="system">System Tags</option>
            <option value="teacher_private">Private Tags</option>
          </select>
          <div style={{ fontSize: 12, color: 'var(--tx3)', display: 'flex', alignItems: 'center' }}>
            System tags are shared and read-only here. Private tags can be created, renamed, and deleted.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>Available Tags</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tags.map(tag => (
              <div key={tag.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{tag.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                    {tag.scope} · Parent: {tag.is_selectable_by_parent ? 'Yes' : 'No'} · Teacher: {tag.is_selectable_by_teacher ? 'Yes' : 'No'}
                  </div>
                </div>
                {tag.scope === 'teacher_private' && (
                  <>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => openEdit(tag)}>
                      Edit
                    </button>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--warn)' }} onClick={() => void handleDelete(tag.uuid)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {editing ? 'Edit Private Tag' : 'Create Private Tag'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-field" placeholder="Tag name" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            {error && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Tag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
