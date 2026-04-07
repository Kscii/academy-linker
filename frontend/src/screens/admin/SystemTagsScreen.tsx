// ============================================================
// Admin SystemTagsScreen — manage system tags
// ============================================================

import { useEffect, useState } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { SystemTag } from '@/types/api';

type TagForm = {
  uuid?: string;
  name: string;
  is_selectable_by_parent: boolean;
  is_selectable_by_teacher: boolean;
  affects_business_logic: boolean;
};

const EMPTY_FORM: TagForm = {
  name: '',
  is_selectable_by_parent: false,
  is_selectable_by_teacher: true,
  affects_business_logic: false,
};

export function AdminSystemTagsScreen() {
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [form, setForm] = useState<TagForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTags = async () => {
    const res = await adminApi.getSystemTags();
    setTags(res.data);
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (tag: SystemTag) => {
    setForm({
      uuid: tag.uuid,
      name: tag.name,
      is_selectable_by_parent: tag.is_selectable_by_parent,
      is_selectable_by_teacher: tag.is_selectable_by_teacher,
      affects_business_logic: tag.affects_business_logic,
    });
    setEditing(true);
    setError('');
    setShowForm(true);
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
        await adminApi.updateSystemTag(form.uuid, {
          name: form.name.trim(),
          is_selectable_by_parent: form.is_selectable_by_parent,
          is_selectable_by_teacher: form.is_selectable_by_teacher,
          affects_business_logic: form.affects_business_logic,
        });
      } else {
        await adminApi.createSystemTag({
          name: form.name.trim(),
          is_selectable_by_parent: form.is_selectable_by_parent,
          is_selectable_by_teacher: form.is_selectable_by_teacher,
          affects_business_logic: form.affects_business_logic,
        });
      }
      setShowForm(false);
      await loadTags();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to save system tag.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>System Tags</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{tags.length} tag{tags.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={openCreate}>
          + New Tag
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{editing ? 'Edit Tag' : 'New Tag'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--tx)' }}>
              <input type="checkbox" checked={form.is_selectable_by_parent} onChange={e => setForm(prev => ({ ...prev, is_selectable_by_parent: e.target.checked }))} />
              Selectable by parent
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--tx)' }}>
              <input type="checkbox" checked={form.is_selectable_by_teacher} onChange={e => setForm(prev => ({ ...prev, is_selectable_by_teacher: e.target.checked }))} />
              Selectable by teacher
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--tx)' }}>
              <input type="checkbox" checked={form.affects_business_logic} onChange={e => setForm(prev => ({ ...prev, affects_business_logic: e.target.checked }))} />
              Affects business logic
            </label>
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tags.map(tag => (
          <div key={tag.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{tag.name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                Parent: {tag.is_selectable_by_parent ? 'Yes' : 'No'} · Teacher: {tag.is_selectable_by_teacher ? 'Yes' : 'No'} · Business logic: {tag.affects_business_logic ? 'Yes' : 'No'}
              </div>
            </div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => openEdit(tag)}>
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
