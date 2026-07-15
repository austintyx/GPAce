import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import './DashboardPage.css';
import Sidebar from '../components/Sidebar';
import { getDisplayName, getInitials, getStoredUser, isGuestSession, clearSession } from '../services/session';
import { updateProfile, changePassword, uploadProfilePicture, removeProfilePicture, deleteAccount } from '../services/authApi';
import { fetchAcademicModules } from '../services/academicApi';

const gradePoints = {
  'A+': 5, A: 5, 'A-': 4.5,
  'B+': 4, B: 3.5, 'B-': 3,
  'C+': 2.5, C: 2, 'D+': 1.5, D: 1,
  F: 0, U: 0
};

function calculateLocalStats(modules) {
  const counted = modules
    .filter((module) => module.status === 'Completed' && gradePoints[module.grade] !== undefined)
    .map((module) => ({ credits: Number(module.credits || 0), gradePoint: gradePoints[module.grade] }));
  const creditsAttempted = counted.reduce((sum, module) => sum + module.credits, 0);
  const qualityPoints = counted.reduce((sum, module) => sum + module.credits * module.gradePoint, 0);
  const creditsCompleted = modules
    .filter((module) => module.status === 'Completed')
    .reduce((sum, module) => sum + Number(module.credits || 0), 0);

  return {
    gpa: creditsAttempted > 0 ? Number((qualityPoints / creditsAttempted).toFixed(2)) : 0,
    creditsCompleted,
    moduleCount: modules.length
  };
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const displayName = getDisplayName();
  const initials = getInitials(displayName);
  const isGuest = isGuestSession();
  const pictureInputRef = useRef(null);

  const [toast, setToast] = useState(null);
  const showSuccess = (text) => setToast({ type: 'success', text });
  const showError = (text) => setToast({ type: 'error', text });

  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (isGuest) {
        const localModules = JSON.parse(localStorage.getItem('guest_modules') || '[]');
        if (!cancelled) setStats(calculateLocalStats(localModules));
        return;
      }

      try {
        const data = await fetchAcademicModules();
        if (cancelled) return;
        setStats({
          gpa: data.summary?.gpa || 0,
          creditsCompleted: data.summary?.creditsCompleted || 0,
          moduleCount: (data.modules || []).length
        });
      } catch (err) {
        if (!cancelled) setStats(null);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [isGuest]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [course, setCourse] = useState(user.course || '');
  const [isDoubleDegree, setIsDoubleDegree] = useState(Boolean(user.isDoubleDegree));
  const [primaryDegreeName, setPrimaryDegreeName] = useState(user.primaryDegreeName || user.course || '');
  const [secondaryDegreeName, setSecondaryDegreeName] = useState(user.secondaryDegreeName || '');
  const [saving, setSaving] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [pictureUploading, setPictureUploading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const persistUser = (nextUser) => {
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const resetProfileFields = (sourceUser) => {
    setName(sourceUser.name || '');
    setCourse(sourceUser.course || '');
    setIsDoubleDegree(Boolean(sourceUser.isDoubleDegree));
    setPrimaryDegreeName(sourceUser.primaryDegreeName || sourceUser.course || '');
    setSecondaryDegreeName(sourceUser.secondaryDegreeName || '');
  };

  const handleStartEditProfile = () => {
    resetProfileFields(user);
    setEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    resetProfileFields(user);
    setEditingProfile(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const data = await updateProfile({ name, course, isDoubleDegree, primaryDegreeName, secondaryDegreeName });
      persistUser(data.user);
      setEditingProfile(false);
      showSuccess('Profile updated.');
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleCancelEditPassword = () => {
    resetPasswordFields();
    setEditingPassword(false);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      showError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);

    try {
      await changePassword(currentPassword, newPassword);
      resetPasswordFields();
      setEditingPassword(false);
      showSuccess('Password updated.');
    } catch (err) {
      showError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePictureChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPictureUploading(true);

    try {
      const data = await uploadProfilePicture(file);
      persistUser(data.user);
      showSuccess('Profile picture updated.');
    } catch (err) {
      showError(err.message);
    } finally {
      setPictureUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    setPictureUploading(true);

    try {
      const data = await removeProfilePicture();
      persistUser(data.user);
      showSuccess('Profile picture removed.');
    } catch (err) {
      showError(err.message);
    } finally {
      setPictureUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);

    try {
      await deleteAccount(deletePassword);
      clearSession();
      navigate('/login');
    } catch (err) {
      showError(err.message);
      setDeletingAccount(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletePassword('');
  };

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content profile-main">
        <header className="dashboard-header">
          <div>
            <h1>Profile</h1>
            <p>Manage your account details, password, and photo.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </header>

        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} role="status">
            <span className="toast-icon" aria-hidden="true">{toast.type === 'error' ? '!' : '✓'}</span>
            <span className="toast-text">{toast.text}</span>
            <button className="toast-dismiss" type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
              &times;
            </button>
          </div>
        )}

        <section className="profile-panel">
          <div className="profile-header">
            {user.profilePicture ? (
              <img className="profile-large-avatar" src={user.profilePicture} alt={displayName} />
            ) : (
              <div className="profile-large-avatar">{initials}</div>
            )}
            <div>
              <h2>{displayName}</h2>
              <p>{isGuest ? 'Guest session' : 'Registered student account'}</p>
              {!isGuest && (
                <div className="profile-picture-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={pictureUploading}
                    onClick={() => pictureInputRef.current?.click()}
                  >
                    {pictureUploading ? 'Working...' : 'Change photo'}
                  </button>
                  {user.profilePicture && (
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={pictureUploading}
                      onClick={handleRemovePicture}
                    >
                      Remove photo
                    </button>
                  )}
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={handlePictureChange}
                  />
                </div>
              )}
            </div>
          </div>

          {stats && stats.moduleCount > 0 && (
            <div className="profile-stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">GPA</span>
                  <span className="stat-icon">Score</span>
                </div>
                <div className="stat-value">{stats.gpa.toFixed(2)}</div>
                <div className="stat-subtitle">out of 5.00</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Completed credits</span>
                  <span className="stat-icon">Credits</span>
                </div>
                <div className="stat-value">{stats.creditsCompleted}</div>
                <div className="stat-subtitle">credits completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Modules tracked</span>
                  <span className="stat-icon">Modules</span>
                </div>
                <div className="stat-value">{stats.moduleCount}</div>
                <div className="stat-subtitle">on your record</div>
              </div>
            </div>
          )}

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

          {!isGuest && !editingProfile && (
            <div className="profile-section-toggle">
              <button className="btn-secondary" type="button" onClick={handleStartEditProfile}>
                Edit Profile
              </button>
            </div>
          )}

          {!isGuest && editingProfile && (
            <form className="profile-form" onSubmit={handleSaveProfile}>
              <h2>Edit Profile</h2>
              <label className="profile-field">
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="profile-field">
                Course
                <input value={course} onChange={(event) => setCourse(event.target.value)} />
              </label>
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
              <div className="profile-form-actions">
                <button className="profile-save btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button className="btn-secondary" type="button" onClick={handleCancelEditProfile} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!isGuest && !editingPassword && (
            <div className="profile-section-toggle">
              <button className="btn-secondary" type="button" onClick={() => setEditingPassword(true)}>
                Change Password
              </button>
            </div>
          )}

          {!isGuest && editingPassword && (
            <form className="profile-form" onSubmit={handleChangePassword}>
              <h2>Change Password</h2>
              <label className="profile-field">
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="profile-field">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="profile-field">
                Confirm new password
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <div className="profile-form-actions">
                <button className="profile-save btn-primary" type="submit" disabled={passwordSaving}>
                  {passwordSaving ? 'Saving...' : 'Change Password'}
                </button>
                <button className="btn-secondary" type="button" onClick={handleCancelEditPassword} disabled={passwordSaving}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {isGuest && (
            <div className="profile-guest-note">
              Guest sessions can't save profile changes. Sign up to edit your profile, set a password, and unlock PDF import.
            </div>
          )}

          {!isGuest && (
            <div className="profile-danger-zone">
              <h2>Danger Zone</h2>
              <p>Permanently delete your account and all tracked modules. This can&rsquo;t be undone.</p>
              <button className="btn-danger" type="button" onClick={() => setDeleteModalOpen(true)}>
                Delete account
              </button>
            </div>
          )}
        </section>
      </main>

      {deleteModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeDeleteModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Delete your account?</h3>
            <p>
              This permanently deletes your account and all tracked modules. This can&rsquo;t be undone.
              Enter your password to confirm.
            </p>
            <label className="profile-field">
              Password
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" type="button" onClick={closeDeleteModal} disabled={deletingAccount}>
                Cancel
              </button>
              <button
                className="btn-danger"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deletePassword}
              >
                {deletingAccount ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
