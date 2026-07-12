import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import './DashboardPage.css';
import Sidebar from '../components/Sidebar';
import { AUTH_API_URL } from '../config/api';
import { getDisplayName, getInitials, getStoredUser, isGuestSession } from '../services/session';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const displayName = getDisplayName();
  const initials = getInitials(displayName);
  const isGuest = isGuestSession();
  const [isDoubleDegree, setIsDoubleDegree] = useState(Boolean(user.isDoubleDegree));
  const [primaryDegreeName, setPrimaryDegreeName] = useState(user.primaryDegreeName || user.course || '');
  const [secondaryDegreeName, setSecondaryDegreeName] = useState(user.secondaryDegreeName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSaveDegreeSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${AUTH_API_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ isDoubleDegree, primaryDegreeName, secondaryDegreeName })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to save double degree settings.');

      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);
      setMessage('Double degree settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content profile-main">
        <header className="dashboard-header">
          <div>
            <h1>Profile</h1>
            <p>Manage your account details and double degree GPA settings.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </header>

        <section className="profile-panel">
          <div className="profile-header">
            <div className="profile-large-avatar">{initials}</div>
            <div>
              <h2>{displayName}</h2>
              <p>{isGuest ? 'Guest session' : 'Registered student account'}</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span>Full name</span>
              <strong>{user.name || 'Guest'}</strong>
            </div>
            <div className="detail-row">
              <span>Email</span>
              <strong>{user.email || 'Not available for guest users'}</strong>
            </div>
            <div className="detail-row">
              <span>School</span>
              <strong>{user.school || 'Not provided'}</strong>
            </div>
            <div className="detail-row">
              <span>Course</span>
              <strong>{user.course || 'Not provided'}</strong>
            </div>
            <div className="detail-row">
              <span>Double degree</span>
              <strong>{user.isDoubleDegree ? 'Yes' : 'No'}</strong>
            </div>
            {user.isDoubleDegree && (
              <>
                <div className="detail-row">
                  <span>Degree 1 GPA</span>
                  <strong>{user.primaryDegreeName || user.course || 'Not provided'}</strong>
                </div>
                <div className="detail-row">
                  <span>Degree 2 GPA</span>
                  <strong>{user.secondaryDegreeName || 'Not provided'}</strong>
                </div>
              </>
            )}
            <div className="detail-row">
              <span>Account type</span>
              <strong>{isGuest ? 'Guest' : 'Registered'}</strong>
            </div>
          </div>

          {!isGuest && (
            <form className="profile-form" onSubmit={handleSaveDegreeSettings}>
              <h2>GPA Settings</h2>
              {(message || error) && (
                <div className={error ? 'notice error' : 'notice success'}>
                  {error || message}
                </div>
              )}
              <label className="profile-checkbox">
                <input
                  type="checkbox"
                  checked={isDoubleDegree}
                  onChange={(event) => setIsDoubleDegree(event.target.checked)}
                />
                <span>I am studying a double degree</span>
              </label>
              <label className="profile-field">
                Degree 1 GPA name
                <input value={primaryDegreeName} onChange={(event) => setPrimaryDegreeName(event.target.value)} />
              </label>
              {isDoubleDegree && (
                <label className="profile-field">
                  Degree 2 GPA name
                  <input value={secondaryDegreeName} onChange={(event) => setSecondaryDegreeName(event.target.value)} />
                </label>
              )}
              <button className="profile-save btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save GPA Settings'}
              </button>
            </form>
          )}

          {isGuest && (
            <div className="profile-guest-note">
              Guest sessions can't save profile changes. Sign up to keep your GPA settings and unlock PDF import.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;
