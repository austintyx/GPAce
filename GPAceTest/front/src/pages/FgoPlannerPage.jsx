import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './DashboardPage.css';
import './FgoPlannerPage.css';
import Sidebar from '../components/Sidebar';
import { fetchAcademicModules, updateAcademicModuleBde } from '../services/academicApi';
import { isGuestSession } from '../services/session';
import {
  fgoSchemes,
  moduleKey,
  isBdeModule,
  sumCredits,
  getFilteredModulesForDegree,
  isCompletedGraded,
  optimiseFgo
} from '../utils/fgoOptimizer';

function FgoPlannerPage() {
  const [isGuest] = useState(isGuestSession);
  const [modules, setModules] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingModuleId, setSavingModuleId] = useState('');
  const [, setUser] = useState(null);
  const [isDoubleDegree, setIsDoubleDegree] = useState(false);
  const [degreeNames, setDegreeNames] = useState({ primary: 'Degree 1', secondary: 'Degree 2' });
  const [selectedDegree, setSelectedDegree] = useState('primary');
  const [fgoScheme, setFgoScheme] = useState(() => localStorage.getItem('fgo_scheme') || '24au');
  const { coreCap, bdeCap } = fgoSchemes[fgoScheme];

  const handleSchemeChange = (schemeKey) => {
    setFgoScheme(schemeKey);
    localStorage.setItem('fgo_scheme', schemeKey);
  };

  const loadModules = useCallback(async () => {
    setMessage('');
    setError('');

    try {
      if (isGuest) {
        setUser(null);
        setIsDoubleDegree(false);
        setDegreeNames({ primary: 'Degree 1', secondary: 'Degree 2' });
        setSelectedDegree('primary');
        setModules(JSON.parse(localStorage.getItem('guest_modules') || '[]'));
        return;
      }

      const data = await fetchAcademicModules();
      setModules(data.modules || []);

      if (data.user) {
        const doubleDegreeFlag = Boolean(data.user.isDoubleDegree);
        setUser(data.user);
        setIsDoubleDegree(doubleDegreeFlag);
        setDegreeNames({
          primary: data.user.primaryDegreeName || data.user.course || 'Degree 1',
          secondary: data.user.secondaryDegreeName || 'Degree 2'
        });

        if (!doubleDegreeFlag) {
          setSelectedDegree('primary');
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [isGuest]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const filteredModules = useMemo(
    () => getFilteredModulesForDegree(modules, selectedDegree, isDoubleDegree),
    [modules, selectedDegree, isDoubleDegree]
  );
  const plan = useMemo(
    () => optimiseFgo(modules, isDoubleDegree, selectedDegree, coreCap, bdeCap),
    [modules, isDoubleDegree, selectedDegree, coreCap, bdeCap]
  );
  const selectedKeys = useMemo(() => new Set(plan.selectedModules.map(moduleKey)), [plan.selectedModules]);
  const completedGradedModules = useMemo(() => (
    filteredModules
      .filter(isCompletedGraded)
      .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
  ), [filteredModules]);

  const updateModuleBde = async (module, isBde) => {
    const updatedModule = { ...module, isBde };
    const nextModules = modules.map((item) => moduleKey(item) === moduleKey(module) ? updatedModule : item);

    setModules(nextModules);
    setMessage('');
    setError('');

    if (isGuest) {
      localStorage.setItem('guest_modules', JSON.stringify(nextModules));
      setMessage('BDE setting updated locally.');
      return;
    }

    setSavingModuleId(moduleKey(module));
    try {
      await updateAcademicModuleBde(module._id, isBde);
      setMessage('BDE setting updated.');
      await loadModules();
    } catch (err) {
      setError(err.message);
      await loadModules();
    } finally {
      setSavingModuleId('');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content planner-main">
        <header className="dashboard-header planner-header">
          <div>
            <h1>FGO Planner</h1>
            <p>Optimise pass/fail choices under the {coreCap} AU Core/MPE/ICC and {bdeCap} AU BDE limits.</p>
          </div>
          <div className="fgo-scheme-toggle-row">
            <span className="fgo-scheme-label">FGO quota</span>
            <div className="fgo-scheme-segmented">
              {Object.entries(fgoSchemes).map(([schemeKey, scheme]) => (
                <button
                  key={schemeKey}
                  type="button"
                  className={`fgo-scheme-segment ${fgoScheme === schemeKey ? 'active' : ''}`}
                  onClick={() => handleSchemeChange(schemeKey)}
                >
                  {scheme.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {(message || error) && (
          <div className={error ? 'notice error' : 'notice success'}>
            {error || message}
          </div>
        )}

        {isDoubleDegree && (
          <div className="degree-toggle-row">
            <button
              type="button"
              className={`btn-secondary ${selectedDegree === 'primary' ? 'selected' : ''}`}
              onClick={() => setSelectedDegree('primary')}
            >
              {degreeNames.primary}
            </button>
            <button
              type="button"
              className={`btn-secondary ${selectedDegree === 'secondary' ? 'selected' : ''}`}
              onClick={() => setSelectedDegree('secondary')}
            >
              {degreeNames.secondary}
            </button>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">{isDoubleDegree ? `${degreeNames[selectedDegree]} GPA` : 'CURRENT GPA'}</span>
              <span className="stat-icon">{isDoubleDegree ? `Degree ${selectedDegree === 'primary' ? '1' : '2'}` : 'Before FGO'}</span>
            </div>
            <div className="stat-value">{plan.currentGpa.toFixed(2)}</div>
            <div className="stat-subtitle">From {plan.totalCredits} graded completed AU</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">PROJECTED GPA</span>
              <span className="stat-icon">After FGO</span>
            </div>
            <div className="stat-value">{plan.projectedGpa.toFixed(2)}</div>
            <div className="stat-subtitle">Improvement: +{plan.improvement.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">FGO BUDGET USED</span>
              <span className="stat-icon">AU caps</span>
            </div>
            <div className="fgo-budget-lines">
              <span>Core/MPE/ICC: <strong>{plan.coreCredits}/{coreCap} AU</strong></span>
              <span>BDE: <strong>{plan.bdeCredits}/{bdeCap} AU</strong></span>
            </div>
            <div className="stat-subtitle">{plan.eligibleCount} eligible graded module(s)</div>
          </div>
        </div>

        <section className="courses-section fgo-recommendation">
          <div className="section-header">
            <h2>Recommended FGO Modules{isDoubleDegree ? ` for ${degreeNames[selectedDegree]}` : ''}</h2>
            <span className="fgo-pill">{sumCredits(plan.selectedModules)} AU selected</span>
          </div>

          {plan.selectedModules.length === 0 ? (
            <div className="fgo-empty">
              No GPA-improving FGO recommendation yet. Mark BDE modules below if needed, then refresh the recommendation.
            </div>
          ) : (
            <div className="fgo-card-grid">
              {plan.selectedModules.map((module) => (
                <article className="fgo-module-card" key={moduleKey(module)}>
                  <div>
                    <strong>{module.code}</strong>
                    <span>{module.name}</span>
                  </div>
                  <div className="fgo-module-meta">
                    <span>{module.credits} AU</span>
                    <span>{module.grade}</span>
                    <span>{isBdeModule(module) ? 'BDE' : 'Core/MPE/ICC'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="courses-section">
          <div className="section-header">
            <div>
              <h2>Completed Graded Modules</h2>
              <p className="section-subtitle">Tick BDE modules. Unticked modules are treated as Core/MPE/ICC for the FGO cap.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="courses-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Name</th>
                  <th>Credits</th>
                  <th>Grade</th>
                  <th>BDE</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {completedGradedModules.map((module) => (
                  <tr key={moduleKey(module)}>
                    <td data-label="Code"><span>{module.code}</span></td>
                    <td data-label="Course Name"><span>{module.name}</span></td>
                    <td data-label="Credits"><span>{module.credits}</span></td>
                    <td data-label="Grade"><span className="grade-badge">{module.grade}</span></td>
                    <td data-label="BDE">
                      <label className="table-checkbox">
                        <input
                          type="checkbox"
                          checked={isBdeModule(module)}
                          disabled={savingModuleId === moduleKey(module)}
                          onChange={(event) => updateModuleBde(module, event.target.checked)}
                        />
                        <span>BDE</span>
                      </label>
                    </td>
                    <td data-label="Recommendation">
                      {selectedKeys.has(moduleKey(module)) ? (
                        <span className="fgo-selected-badge">FGO</span>
                      ) : (
                        <span className="fgo-muted">Keep graded</span>
                      )}
                    </td>
                  </tr>
                ))}
                {completedGradedModules.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan="6">No completed graded modules yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FgoPlannerPage;
