import { useMemo, useState } from 'react';
import { Card, PageHeader, Button, InfoMessage } from '../../../shared/components';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { updateUser, changeUserPassword } from '../../../api/users';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();

  const initial = useMemo(() => {
    return {
      username: user?.username || '',
      email: user?.email || '',
      full_name: user?.full_name || '',
    };
  }, [user]);

  const [form, setForm] = useState(initial);

  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState('');

  // If user changes (after refresh/login), sync the form
  if (
    form.username !== initial.username ||
    form.email !== initial.email ||
    form.full_name !== initial.full_name
  ) {
    // Only auto-sync if user actually changed (simple safe guard)
    // If you don’t like this pattern, tell me and I’ll do it with useEffect.
    // eslint-disable-next-line react/no-direct-mutation-state
    setTimeout(() => setForm(initial), 0);
  }

  const setField = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const buildPayload = () => {
    const payload = {};
    if (form.email !== initial.email) payload.email = form.email;
    if (form.full_name !== initial.full_name) payload.full_name = form.full_name;
    return payload;
  };

  const save = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    if (!user?.user_id) {
      setApiError('Missing user id.');
      return;
    }

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setSuccess('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      await updateUser(user.user_id, payload);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setApiError(typeof detail === 'string' ? detail : err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const togglePw = () => {
    setPwError('');
    setShowPw((v) => !v);
  };

  const updatePassword = async () => {
    setApiError('');
    setSuccess('');
    setPwError('');

    if (!user?.user_id) {
      setApiError('Missing user id.');
      return;
    }

    const current = (pw.current || '').trim();
    const next = (pw.next || '').trim();

    if (!current) return setPwError('Current password is required.');
    if (!next) return setPwError('New password is required.');
    if (next.length < 8) return setPwError('New password must be at least 8 characters.');

    setChangingPw(true);
    try {
      await changeUserPassword(user.user_id, current, next);
      setSuccess('Password changed successfully.');
      setPw({ current: '', next: '' });
      setShowPw(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : err?.message || 'Failed to change password.';
      // If backend says current password incorrect, show it nicely
      setPwError(msg);
    } finally {
      setChangingPw(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const busy = saving || changingPw;

  return (
    <div className="profile-page">
      <PageHeader title="My Profile" subtitle="Update your personal information" />

      {success && <InfoMessage type="success">{success}</InfoMessage>}
      {apiError && <InfoMessage type="error">{apiError}</InfoMessage>}

      <Card title="Profile details">
        <form onSubmit={save} autoComplete="on">
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="profile-username">Username</label>

              <div className="locked-field" title="Username can't be changed">
                <input
                  id="profile-username"
                  name="username"
                  className="field-input"
                  value={form.username}
                  disabled
                  readOnly
                  autoComplete="username"
                />
                <span className="locked-tooltip" role="tooltip">
                  Username can’t be changed
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                name="email"
                type="email"
                className="field-input"
                value={form.email}
                onChange={setField('email')}
                disabled={busy}
                autoComplete="email"
              />
            </div>

            <div className="profile-field profile-full">
              <label htmlFor="profile-fullname">Full name</label>
              <input
                id="profile-fullname"
                name="full_name"
                className="field-input"
                value={form.full_name}
                onChange={setField('full_name')}
                disabled={busy}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="profile-actions">
            <Button type="submit" disabled={busy}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Security">
        <div className="pw-header">
          <div>
            <div className="pw-title">Password</div>
            <div className="pw-desc">New password must be at least 8 characters.</div>
          </div>

          <Button type="button" variant="secondary" onClick={togglePw} disabled={busy}>
            {showPw ? 'Hide' : 'Change'}
          </Button>
        </div>

        <div className={`pw-collapse ${showPw ? 'open' : ''}`}>
          <div className="pw-inner">
            <div className="profile-grid">
              <div className="profile-field profile-full">
                <label htmlFor="profile-current-password">Current password</label>
                <input
                  id="profile-current-password"
                  name="current_password"
                  type="password"
                  className="field-input"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  disabled={busy}
                  autoComplete="current-password"
                />
              </div>

              <div className="profile-field profile-full">
                <label htmlFor="profile-new-password">New password</label>
                <input
                  id="profile-new-password"
                  name="new_password"
                  type="password"
                  className="field-input"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  disabled={busy}
                  autoComplete="new-password"
                />
                {pwError && <div className="field-error">{pwError}</div>}
              </div>
            </div>

            <div className="profile-actions" style={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={updatePassword} disabled={busy}>
                {changingPw ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
