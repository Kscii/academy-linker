// ============================================================
// Admin UsersScreen — manage users across roles
// ============================================================

import { useEffect, useState } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminUser, CreateUserRequest, PaginationMeta, UserRole } from '@/types/api';

type UserRow = AdminUser & { phone_number: string | null };

type UserForm = Omit<CreateUserRequest, 'role'> & {
  uuid?: string;
  role: UserRole;
  is_active?: boolean;
  phone_dirty?: boolean;
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

const EMPTY_FORM: UserForm = {
  role: 'teacher',
  display_name: '',
  email: '',
  password: '',
  phone_number: '',
  is_active: true,
  phone_dirty: false,
};

function toUserRow(item: AdminUser): UserRow {
  return { ...item, phone_number: null };
}

export function AdminUsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc' | 'display_name_asc'>('display_name_asc');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    const res = await adminApi.getUsers({
      page,
      page_size: 20,
      role: role === 'all' ? undefined : role,
      keyword: keyword.trim() || undefined,
      sort,
    });
    let rows = res.data.map(toUserRow);
    if (status !== 'all') {
      rows = rows.filter(item => item.is_active === (status === 'active'));
    }
    setUsers(rows);
    setMeta(res.meta);
  };

  useEffect(() => {
    void loadUsers();
  }, [page, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (user: UserRow) => {
    setForm({
      uuid: user.uuid,
      role: user.role,
      display_name: user.display_name,
      email: user.email,
      password: '',
      phone_number: '',
      is_active: user.is_active,
      phone_dirty: false,
    });
    setEditing(true);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (!editing && !form.password.trim()) {
      setError('Password is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editing && form.uuid) {
        const body: {
          display_name?: string | null;
          is_active?: boolean | null;
          phone_number?: string | null;
        } = {
          display_name: form.display_name.trim(),
          is_active: form.is_active ?? true,
        };
        if (form.phone_dirty) {
          body.phone_number = form.phone_number?.trim() || null;
        }
        await adminApi.updateUser(form.uuid, body);
      } else {
        await adminApi.createUser({
          role: form.role,
          display_name: form.display_name.trim(),
          email: form.email.trim(),
          phone_number: form.phone_number?.trim() || null,
          password: form.password,
        });
      }
      setShowForm(false);
      await loadUsers();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Users</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{meta.total} user{meta.total !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={openCreate}>
          + New User
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(4, minmax(120px, 1fr)) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Search</label>
            <input className="input-field" placeholder="Search by name or email" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Role</label>
            <select className="input-field" value={role} onChange={e => setRole(e.target.value as typeof role)}>
              <option value="all">All roles</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Sort</label>
            <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
              <option value="display_name_asc">Name A-Z</option>
              <option value="created_at_desc">Newest</option>
              <option value="created_at_asc">Oldest</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Page</label>
            <div className="input-field" style={{ display: 'flex', alignItems: 'center' }}>{meta.page} / {Math.max(meta.total_pages, 1)}</div>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => { setPage(1); void loadUsers(); }}>
            Apply
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {editing ? 'Edit User' : 'New User'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!editing && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Role</label>
                <select className="input-field" value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value as UserRole }))}>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Full Name</label>
              <input className="input-field" value={form.display_name} onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Email</label>
              <input className="input-field" type="email" value={form.email} disabled={editing} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>
                {editing ? 'Phone Number (overwrite if provided)' : 'Phone Number'}
              </label>
              <input className="input-field" value={form.phone_number ?? ''} placeholder={editing ? 'Unknown from list response' : '+61 4xx xxx xxx'} onChange={e => setForm(prev => ({ ...prev, phone_number: e.target.value, phone_dirty: true }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className="input-field" type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
            </div>
            {editing && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>Status</label>
                <select className="input-field" value={String(form.is_active ?? true)} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
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
        {users.map(user => (
          <div key={user.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ background: 'var(--a4)', color: '#fff', width: 38, height: 38, fontSize: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user.display_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{user.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{user.email}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{user.role} · Phone: {user.phone_number ?? 'Not returned by list API'}</div>
            </div>
            <span className="badge" style={{ background: user.is_active ? 'var(--a3)18' : 'var(--tx3)18', color: user.is_active ? 'var(--a3)' : 'var(--tx3)', fontSize: 10 }}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => openEdit(user)}>
              Edit
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          Previous
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
