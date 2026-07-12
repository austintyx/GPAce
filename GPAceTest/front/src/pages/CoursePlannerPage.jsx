import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './DashboardPage.css';
import './CoursePlannerPage.css';
import Sidebar from '../components/Sidebar';
import { ChevronDownIcon } from '../components/Icons';
import { fetchAcademicModules, updateAcademicModule } from '../services/academicApi';
import { isGuestSession } from '../services/session';

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

// Semester columns are always kept alphabetically sorted (e.g. "YEAR 2
// SEMESTER 1" < "YEAR 2 SEMESTER 2" < "YEAR 2 SPECIAL SEMESTER", since
// "SEMESTER" sorts before "SPECIAL"), so semesters discovered dynamically
// from imported modules land in the right spot instead of always being
// appended to the end of the list.
function sortSemesters(list) {
  return [...list].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function loadStoredSemesters() {
  try {
    const saved = JSON.parse(localStorage.getItem('planner_semesters') || 'null');
    return sortSemesters(Array.isArray(saved) && saved.length > 0 ? saved : defaultSemesters);
  } catch (err) {
    return sortSemesters(defaultSemesters);
  }
}

function saveStoredSemesters(semesters) {
  localStorage.setItem('planner_semesters', JSON.stringify(semesters));
}

function loadCollapsedSemesters() {
  try {
    const saved = JSON.parse(localStorage.getItem('planner_collapsed_semesters') || 'null');
    return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch (err) {
    return new Set();
  }
}

function saveCollapsedSemesters(collapsed) {
  localStorage.setItem('planner_collapsed_semesters', JSON.stringify(Array.from(collapsed)));
}

function CoursePlannerPage() {
  const [isGuest] = useState(isGuestSession);
  const [modules, setModules] = useState([]);
  const [semesters, setSemesters] = useState(loadStoredSemesters);
  const [collapsedSemesters, setCollapsedSemesters] = useState(loadCollapsedSemesters);
  const [editingSemester, setEditingSemester] = useState('');
  const [draftSemesterName, setDraftSemesterName] = useState('');
  const [draggedModuleKey, setDraggedModuleKey] = useState('');
  const [activeDropSemester, setActiveDropSemester] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const sorted = sortSemesters(nextSemesters);
      saveStoredSemesters(sorted);
      return sorted;
    });
  }, [modules]);

  const toggleSemesterCollapsed = (semester) => {
    setCollapsedSemesters((current) => {
      const next = new Set(current);
      if (next.has(semester)) next.delete(semester);
      else next.add(semester);
      saveCollapsedSemesters(next);
      return next;
    });
  };

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

    const nextSemesters = sortSemesters([...semesters, label]);
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
    setCollapsedSemesters((current) => {
      if (!current.has(semester)) return current;
      const next = new Set(current);
      next.delete(semester);
      saveCollapsedSemesters(next);
      return next;
    });

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

    const nextSemesters = sortSemesters(semesters.map((semester) => semester === oldName ? newName : semester));
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
    setCollapsedSemesters((current) => {
      if (!current.has(oldName)) return current;
      const next = new Set(current);
      next.delete(oldName);
      next.add(newName);
      saveCollapsedSemesters(next);
      return next;
    });
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
      <Sidebar />

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
              const isCollapsed = collapsedSemesters.has(semester);

              return (
                <div
                  key={semester}
                  className={`semester-board ${activeDropSemester === semester ? 'drop-active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
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
                      <button
                        type="button"
                        className="semester-collapse-toggle"
                        onClick={() => toggleSemesterCollapsed(semester)}
                        aria-label={isCollapsed ? `Expand ${semester}` : `Collapse ${semester}`}
                        aria-expanded={!isCollapsed}
                      >
                        <ChevronDownIcon width={16} height={16} />
                      </button>
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

                  {!isCollapsed && (
                    <div className="semester-module-list">
                      {semesterModules.map((module) => renderDraggableModule(module))}
                      {semesterModules.length === 0 && (
                        <div className="empty-semester">Drop modules here</div>
                      )}
                    </div>
                  )}
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
