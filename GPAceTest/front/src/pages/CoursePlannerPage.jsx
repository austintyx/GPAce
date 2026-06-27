import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './DashboardPage.css';
import './CoursePlannerPage.css';
import { fetchAcademicModules, updateAcademicModule } from '../services/academicApi';
import { clearSession, getDisplayName, getInitials, isGuestSession } from '../services/session';

const defaultSemesters = [
  'YEAR 1 SEMESTER 1',
  'YEAR 1 SEMESTER 2',
  'YEAR 1 SPECIAL SEMESTER',
  'YEAR 2 SEMESTER 1',
  'YEAR 2 SEMESTER 2',
  'YEAR 3 SEMESTER 1',
  'YEAR 3 SEMESTER 2',
  'YEAR 4 SEMESTER 1',
  'YEAR 4 SEMESTER 2'
];

function moduleKey(module) {
  return module._id || `${module.code}-${module.academicYear}`;
}

function sumCredits(modules) {
  return modules.reduce((sum, module) => sum + Number(module.credits || 0), 0);
}

function loadStoredSemesters() {
  try {
    const saved = JSON.parse(localStorage.getItem('planner_semesters') || 'null');
    return Array.isArray(saved) && saved.length > 0 ? saved : defaultSemesters;
  } catch (err) {
    return defaultSemesters;
  }
}

function saveStoredSemesters(semesters) {
  localStorage.setItem('planner_semesters', JSON.stringify(semesters));
}

function CoursePlannerPage() {
  const displayName = getDisplayName();
  const initials = getInitials(displayName);
  const [isGuest] = useState(isGuestSession);
  const [modules, setModules] = useState([]);
  const [semesters, setSemesters] = useState(loadStoredSemesters);
  const [editingSemester, setEditingSemester] = useState('');
  const [draftSemesterName, setDraftSemesterName] = useState('');
  const [draggedModuleKey, setDraggedModuleKey] = useState('');
  const [activeDropSemester, setActiveDropSemester] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const loadModules = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (isGuest) {
        const localModules = JSON.parse(localStorage.getItem('guest_modules') || '[]');
        setModules(localModules);
        return;
      }

      const data = await fetchAcademicModules();
      setModules(data.modules || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  useEffect(() => {
    setSemesters((currentSemesters) => {
      const nextSemesters = [...currentSemesters];
      modules.forEach((module) => {
        const label = module.academicYear || 'Unscheduled';
        if (label === 'Unscheduled') return;
        if (!nextSemesters.includes(label)) nextSemesters.push(label);
      });
      saveStoredSemesters(nextSemesters);
      return nextSemesters;
    });
  }, [modules]);

  const groupedModules = useMemo(() => {
    return semesters.reduce((groups, semester) => ({
      ...groups,
      [semester]: modules
        .filter((module) => (module.academicYear || 'Unscheduled') === semester)
        .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    }), {});
  }, [modules, semesters]);

  const drawerModules = useMemo(() => {
    return modules
      .filter((module) => {
        const label = module.academicYear || 'Unscheduled';
        return label === 'Unscheduled' || !semesters.includes(label);
      })
      .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
  }, [modules, semesters]);

  const persistModules = (nextModules) => {
    if (isGuest) localStorage.setItem('guest_modules', JSON.stringify(nextModules));
  };

  const moveModule = async (targetSemester) => {
    if (!draggedModuleKey) return;

    const moduleToMove = modules.find((module) => moduleKey(module) === draggedModuleKey);
    if (!moduleToMove || moduleToMove.academicYear === targetSemester) {
      setDraggedModuleKey('');
      setActiveDropSemester('');
      return;
    }

    const updatedModule = { ...moduleToMove, academicYear: targetSemester };
    const nextModules = modules.map((module) =>
      moduleKey(module) === draggedModuleKey ? updatedModule : module
    );

    setModules(nextModules);
    persistModules(nextModules);
    setMessage('');
    setError('');

    try {
      if (!isGuest) await updateAcademicModule(updatedModule);
      setMessage(`${updatedModule.code} moved to ${targetSemester}.`);
    } catch (err) {
      setError(err.message);
      await loadModules();
    } finally {
      setDraggedModuleKey('');
      setActiveDropSemester('');
    }
  };

  const addSemester = () => {
    const base = `NEW SEMESTER ${semesters.length + 1}`;
    let label = base;
    let count = 2;
    while (semesters.includes(label)) {
      label = `${base} ${count}`;
      count += 1;
    }

    const nextSemesters = [...semesters, label];
    setSemesters(nextSemesters);
    saveStoredSemesters(nextSemesters);
    setEditingSemester(label);
    setDraftSemesterName(label);
  };

  const removeSemester = async (semester) => {
    const semesterModules = modules.filter((module) => (module.academicYear || 'Unscheduled') === semester);
    if (semesterModules.length > 0) {
      const confirmed = window.confirm(`Remove ${semester} and move its modules to Unscheduled?`);
      if (!confirmed) return;
    }

    const nextSemesters = semesters.filter((item) => item !== semester);

    const nextModules = modules.map((module) =>
      (module.academicYear || 'Unscheduled') === semester
        ? { ...module, academicYear: 'Unscheduled' }
        : module
    );

    setSemesters(nextSemesters);
    saveStoredSemesters(nextSemesters);
    setModules(nextModules);
    persistModules(nextModules);

    try {
      if (!isGuest) {
        await Promise.all(semesterModules.map((module) => updateAcademicModule({ ...module, academicYear: 'Unscheduled' })));
      }
      setMessage(`${semester} removed.`);
    } catch (err) {
      setError(err.message);
      await loadModules();
    }
  };

  const saveSemesterName = async (oldName) => {
    const newName = draftSemesterName.trim();
    if (!newName || newName === oldName) {
      setEditingSemester('');
      return;
    }

    if (semesters.includes(newName)) {
      setError('A semester with that name already exists.');
      return;
    }

    const nextSemesters = semesters.map((semester) => semester === oldName ? newName : semester);
    const affectedModules = modules.filter((module) => (module.academicYear || 'Unscheduled') === oldName);
    const nextModules = modules.map((module) =>
      (module.academicYear || 'Unscheduled') === oldName
        ? { ...module, academicYear: newName }
        : module
    );

    setSemesters(nextSemesters);
    saveStoredSemesters(nextSemesters);
    setModules(nextModules);
    persistModules(nextModules);
    setEditingSemester('');
    setMessage('');
    setError('');

    try {
      if (!isGuest) {
        await Promise.all(affectedModules.map((module) => updateAcademicModule({ ...module, academicYear: newName })));
      }
      setMessage(`${oldName} renamed to ${newName}.`);
    } catch (err) {
      setError(err.message);
      await loadModules();
    }
  };

  const renderDraggableModule = (module, compact = false) => (
    <div
      key={moduleKey(module)}
      className={`planner-module-card ${module.status === 'Completed' ? 'completed' : ''} ${compact ? 'compact' : ''}`}
      draggable
      onDragStart={(event) => {
        setDraggedModuleKey(moduleKey(module));
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setDraggedModuleKey('');
        setActiveDropSemester('');
      }}
    >
      <div>
        <strong>{module.code}</strong>
        <span>{module.name}</span>
      </div>
      <div className="planner-module-meta">
        <span>{module.credits} AU</span>
        <span className={`planner-status ${String(module.status).toLowerCase().replace(/\s+/g, '-')}`}>
          {module.status}
        </span>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">GP</div>
          <h2>GPAce</h2>
        </div>
        <nav className="nav-menu">
          <a href="/dashboard" className="nav-item">
            <span className="nav-icon">Dashboard</span>
          </a>
          <a href="/courses" className="nav-item active">
            <span className="nav-icon">Course Planner</span>
          </a>
        </nav>
        <div className="user-profile">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{displayName}</div>
            <a className="profile-link" href="/profile">View Profile</a>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <main className="main-content planner-main">
        <header className="dashboard-header planner-header">
          <div>
            <h1>Course Planner</h1>
            <p>Drag modules from the course drawer into semesters, rename semesters, and adjust your plan.</p>
          </div>
          <div className="planner-actions">
            <button className="btn-primary" type="button" onClick={addSemester}>
              Add Semester
            </button>
            <button className="btn-secondary" type="button" onClick={loadModules} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </header>

        {(message || error) && (
          <div className={error ? 'notice error' : 'notice success'}>
            {error || message}
          </div>
        )}

        <div className="planner-layout">
          <aside className="course-drawer">
            <div className="course-drawer-header">
              <h2>All Courses</h2>
              <span>{drawerModules.length}</span>
            </div>
            <div
              className={`unplaced-drop ${activeDropSemester === 'Unscheduled' ? 'drop-active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setActiveDropSemester('Unscheduled');
              }}
              onDragLeave={() => setActiveDropSemester('')}
              onDrop={(event) => {
                event.preventDefault();
                moveModule('Unscheduled');
              }}
            >
              Drop here to unschedule
            </div>
            <div className="course-drawer-list">
              {drawerModules.map((module) => renderDraggableModule(module, true))}
              {drawerModules.length === 0 && (
                <div className="empty-drawer">All courses are placed in semesters.</div>
              )}
            </div>
          </aside>

          <section className="semester-column">
            {semesters.map((semester) => {
              const semesterModules = groupedModules[semester] || [];
              const isEditing = editingSemester === semester;

              return (
                <div
                  key={semester}
                  className={`semester-board ${activeDropSemester === semester ? 'drop-active' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setActiveDropSemester(semester);
                  }}
                  onDragLeave={() => setActiveDropSemester('')}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveModule(semester);
                  }}
                >
                  <div className="semester-header">
                    <div>
                      {isEditing ? (
                        <input
                          className="semester-name-input"
                          autoFocus
                          value={draftSemesterName}
                          onChange={(event) => setDraftSemesterName(event.target.value)}
                          onBlur={() => saveSemesterName(semester)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                            if (event.key === 'Escape') setEditingSemester('');
                          }}
                        />
                      ) : (
                        <h2 onDoubleClick={() => {
                          setEditingSemester(semester);
                          setDraftSemesterName(semester);
                        }}>
                          {semester}
                        </h2>
                      )}
                      <p>{semesterModules.length} modules</p>
                    </div>
                    <div className="semester-actions">
                      <span>{sumCredits(semesterModules)} AU</span>
                      <button type="button" onClick={() => {
                        setEditingSemester(semester);
                        setDraftSemesterName(semester);
                      }}>
                        Rename
                      </button>
                      <button type="button" onClick={() => removeSemester(semester)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="semester-module-list">
                    {semesterModules.map((module) => renderDraggableModule(module))}
                    {semesterModules.length === 0 && (
                      <div className="empty-semester">Drop modules here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}

export default CoursePlannerPage;
