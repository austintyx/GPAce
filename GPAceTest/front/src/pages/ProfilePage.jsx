import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import { AUTH_API_URL } from '../config/api';
import { clearSession, getDisplayName, getInitials, getStoredUser, isGuestSession } from '../services/session';

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

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

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
    <main className="profile-page">
      <div className="profile-page-shell">
        <header className="profile-topnav">
          <div className="profile-brand">
            <img src={`${process.env.PUBLIC_URL}/logo192.png`} alt="GPAce" className="profile-brand-icon" />
            <span>GPAce</span>
          </div>
          <nav className="profile-nav-links">
            <a href="/dashboard" className="profile-nav-link">Dashboard</a>
            <a href="/courses" className="profile-nav-link">Course Planner</a>
            <a href="/fgo" className="profile-nav-link">FGO Planner</a>
            <a href="/profile" className="profile-nav-link active">Profile</a>
          </nav>
          <button className="profile-page-logout" type="button" onClick={handleLogout}>
            Log out
          </button>
        </header>

        <section className="profile-panel">
          <div className="profile-topbar">
            <button className="profile-back" type="button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>

          <div className="profile-header">
          <div className="profile-large-avatar">{initials}</div>
          <div>
            <h1>{displayName}</h1>
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
                <div className={error ? 'profile-notice error' : 'profile-notice success'}>
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
              <button className="profile-save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save GPA Settings'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
