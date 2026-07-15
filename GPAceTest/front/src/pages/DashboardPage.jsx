import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../pages/DashboardPage.css';
import Sidebar from '../components/Sidebar';
import {
  addAcademicModule,
  buildGradePlan,
  clearAcademicModules,
  deleteAcademicModule,
  fetchAcademicModules,
  predictGpaBuckets,
  updateAcademicModule,
  uploadCurriculum,
  uploadGpaMapping,
  uploadTranscript
} from '../services/academicApi';
import { getStoredUser, isGuestSession } from '../services/session';
import { optimiseFgo, moduleKey, fgoSchemes } from '../utils/fgoOptimizer';

const emptyModule = {
  academicYear: '',
  code: '',
  name: '',
  credits: 3,
  grade: '-',
  status: 'Planned',
  gpaBucket: 'primary',
  isBde: false
};

const gradeOptions = ['-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D+', 'D', 'F', 'P', 'U', 'PASS', 'EX'];
const statusOptions = ['Completed', 'In Progress', 'Planned'];
const gpaBucketOptions = ['primary', 'secondary', 'shared', 'excluded', 'unassigned'];
const academicYearOptions = [
  'YEAR 1 SEMESTER 1',
  'YEAR 1 SEMESTER 2',
  'YEAR 2 SEMESTER 1',
  'YEAR 2 SEMESTER 2',
  'YEAR 3 SEMESTER 1',
  'YEAR 3 SEMESTER 2',
  'YEAR 4 SEMESTER 1',
  'YEAR 4 SEMESTER 2'
];
const completedGradeSet = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D+', 'D', 'F', 'U', 'P', 'PASS', 'EX']);
const gradePoints = {
  'A+': 5,
  A: 5,
  'A-': 4.5,
  'B+': 4,
  B: 3.5,
  'B-': 3,
  'C+': 2.5,
  C: 2,
  'D+': 1.5,
  D: 1,
  F: 0,
  U: 0
};
const planGradeLadder = ['F', 'D', 'D+', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
const tabOptions = ['All Courses', 'Completed', 'Planned', 'In Progress'];
const gradeRank = {
  'A+': 0,
  A: 1,
  'A-': 2,
  'B+': 3,
  B: 4,
  'B-': 5,
  'C+': 6,
  C: 7,
  'D+': 8,
  D: 9,
  F: 10,
  P: 11,
  PASS: 11,
  U: 12,
  EX: 13,
  '-': 14
};
const gradeTierMap = {
  'A+': 'excellent', A: 'excellent', 'A-': 'excellent',
  'B+': 'good', B: 'good', 'B-': 'good',
  'C+': 'fair', C: 'fair',
  'D+': 'poor', D: 'poor', F: 'poor', U: 'poor',
  P: 'neutral', PASS: 'neutral', EX: 'neutral'
};

function getTabCourses(courses, tab) {
  if (tab === 'All Courses') return courses;
  return courses.filter((course) => course.status === tab.replace(' Courses', ''));
}

function sumCredits(courses) {
  return courses.reduce((sum, course) => sum + Number(course.credits || 0), 0);
}

function isIncludedInGpaCategory(course) {
  return course.status === 'Completed' && completedGradeSet.has(String(course.grade || '').toUpperCase());
}

function getCoursesForGpa(courses, bucket) {
  return courses.filter((course) => {
    if (!isIncludedInGpaCategory(course)) return false;
    const gpaBucket = course.gpaBucket || 'primary';
    return moduleMatchesGpaBucket(gpaBucket, bucket);
  });
}

function moduleMatchesGpaBucket(gpaBucket, bucket) {
  const normalizedBucket = gpaBucket || 'primary';
  if (bucket === 'overall') return normalizedBucket !== 'excluded';
  if (bucket === 'primary') return ['primary', 'shared'].includes(normalizedBucket);
  if (bucket === 'secondary') return ['secondary', 'shared'].includes(normalizedBucket);
  return false;
}

function getGradeTier(grade) {
  return gradeTierMap[String(grade || '').toUpperCase()] || 'unset';
}

const honoursBands = [
  { min: 4.5, label: 'Highest Distinction', tier: 'highest-distinction' },
  { min: 4.0, label: 'Distinction', tier: 'distinction' },
  { min: 3.5, label: 'Merit', tier: 'merit' },
  { min: 3.0, label: 'Honours', tier: 'honours' }
];

function getHonoursTier(gpa) {
  const value = Number(gpa) || 0;
  return honoursBands.find((band) => value >= band.min) || { label: 'Pass', tier: 'pass' };
}

function formatGpaDelta(current, target) {
  const diff = Number((current - target).toFixed(2));
  if (diff >= 0) return `+${diff.toFixed(2)} above your goal`;
  return `${Math.abs(diff).toFixed(2)} below your goal`;
}

function buildRequiredAverageForGpa(courses, bucket, targetGPA, excludedKeys = new Set()) {
  const bucketCourses = courses.filter((course) => moduleMatchesGpaBucket(course.gpaBucket, bucket));
  const completed = bucketCourses
    .filter((course) => course.status === 'Completed' && gradePoints[String(course.grade || '').toUpperCase()] !== undefined)
    .filter((course) => !excludedKeys.has(moduleKey(course)))
    .map((course) => ({
      ...course,
      credits: Number(course.credits || 0),
      gradePoint: gradePoints[String(course.grade || '').toUpperCase()]
    }));
  const futureCredits = bucketCourses
    .filter((course) => ['Planned', 'In Progress'].includes(course.status))
    .reduce((sum, course) => sum + Number(course.credits || 0), 0);
  const creditsAttempted = completed.reduce((sum, course) => sum + course.credits, 0);
  const qualityPoints = completed.reduce((sum, course) => sum + course.credits * course.gradePoint, 0);
  const currentGpa = creditsAttempted > 0 ? qualityPoints / creditsAttempted : 0;
  const target = Number(targetGPA);

  if (futureCredits <= 0) {
    return {
      requiredAverageGradePoint: 0,
      futureCredits,
      possible: currentGpa >= target,
      message: currentGpa >= target ? 'Target reached with current graded modules.' : 'Add planned modules for this degree to calculate this.'
    };
  }

  const required = (target * (creditsAttempted + futureCredits) - qualityPoints) / futureCredits;
  const displayRequired = Math.max(0, required);

  return {
    requiredAverageGradePoint: Number(displayRequired.toFixed(2)),
    futureCredits,
    possible: required <= 5,
    message: required <= 5
      ? `Needs about ${displayRequired.toFixed(2)} grade points across ${futureCredits} future credits.`
      : 'Target is not reachable for this degree with the listed future credits.'
  };
}

function getPlanCourses(courses, bucket) {
  return courses.filter((course) => moduleMatchesGpaBucket(course.gpaBucket, bucket));
}

function calculateFinalGpa(completedCredits, completedQualityPoints, assignments) {
  const futureCredits = assignments.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  const futureQualityPoints = assignments.reduce((sum, item) => sum + Number(item.credits || 0) * gradePoints[item.suggestedGrade], 0);
  const totalCredits = completedCredits + futureCredits;
  return totalCredits > 0 ? Number(((completedQualityPoints + futureQualityPoints) / totalCredits).toFixed(2)) : 0;
}

function buildScenarioFromOrder({ futureModules, completedCredits, completedQualityPoints, neededFutureQualityPoints, strategy }) {
  const assignments = strategy.order(futureModules).map((module) => ({
    code: module.code,
    name: module.name,
    credits: Number(module.credits || 0),
    gradeIndex: 0,
    suggestedGrade: planGradeLadder[0]
  }));
  let futureQualityPoints = 0;

  const upgrade = (assignment) => {
    if (assignment.gradeIndex >= planGradeLadder.length - 1) return false;
    const previousPoint = gradePoints[planGradeLadder[assignment.gradeIndex]];
    assignment.gradeIndex += 1;
    assignment.suggestedGrade = planGradeLadder[assignment.gradeIndex];
    const nextPoint = gradePoints[assignment.suggestedGrade];
    futureQualityPoints += assignment.credits * (nextPoint - previousPoint);
    return true;
  };

  if (neededFutureQualityPoints > 0) {
    if (strategy.mode === 'focus') {
      for (const assignment of assignments) {
        while (futureQualityPoints < neededFutureQualityPoints && upgrade(assignment)) {
          // Keep this module moving upward before trying the next scenario slot.
        }
        if (futureQualityPoints >= neededFutureQualityPoints) break;
      }
    } else {
      let changed = true;
      while (futureQualityPoints < neededFutureQualityPoints && changed) {
        changed = false;
        for (const assignment of assignments) {
          if (futureQualityPoints >= neededFutureQualityPoints) break;
          changed = upgrade(assignment) || changed;
        }
      }
    }
  }

  const sortedAssignments = assignments
    .map(({ gradeIndex, ...assignment }) => assignment)
    .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));

  return {
    name: strategy.name,
    assignments: sortedAssignments,
    finalGpa: calculateFinalGpa(completedCredits, completedQualityPoints, sortedAssignments)
  };
}

function generateGradePlanPermutations(courses, bucket, targetGPA, excludedKeys = new Set()) {
  const bucketCourses = getPlanCourses(courses, bucket);
  const completedModules = bucketCourses
    .filter((course) => course.status === 'Completed' && gradePoints[String(course.grade || '').toUpperCase()] !== undefined)
    .filter((course) => !excludedKeys.has(moduleKey(course)))
    .map((course) => ({
      ...course,
      credits: Number(course.credits || 0),
      gradePoint: gradePoints[String(course.grade || '').toUpperCase()]
    }));
  const futureModules = bucketCourses
    .filter((course) => ['Planned', 'In Progress'].includes(course.status) && Number(course.credits || 0) > 0)
    .map((course) => ({ ...course, credits: Number(course.credits || 0) }));

  const completedCredits = completedModules.reduce((sum, course) => sum + course.credits, 0);
  const completedQualityPoints = completedModules.reduce((sum, course) => sum + course.credits * course.gradePoint, 0);
  const futureCredits = futureModules.reduce((sum, course) => sum + course.credits, 0);
  const target = Number(targetGPA);

  if (futureCredits <= 0) {
    return {
      possible: false,
      message: 'Add planned or in-progress modules to generate grade plan permutations.',
      scenarios: []
    };
  }

  const neededFutureQualityPoints = target * (completedCredits + futureCredits) - completedQualityPoints;
  const maxFutureQualityPoints = futureCredits * 5;

  if (neededFutureQualityPoints > maxFutureQualityPoints) {
    return {
      possible: false,
      message: 'This target is not reachable with the listed future modules.',
      scenarios: []
    };
  }

  const strategies = [
    {
      name: 'Higher grades on bigger AU modules',
      mode: 'focus',
      order: (items) => [...items].sort((a, b) => Number(b.credits) - Number(a.credits) || String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    },
    {
      name: 'Spread grades evenly',
      mode: 'round',
      order: (items) => [...items].sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    },
    {
      name: 'Protect harder modules',
      mode: 'focus',
      order: (items) => [...items].sort((a, b) => Number(a.credits) - Number(b.credits) || String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    },
    {
      name: 'Late-plan push',
      mode: 'round',
      order: (items) => [...items].sort((a, b) => String(b.academicYear || '').localeCompare(String(a.academicYear || ''), undefined, { numeric: true }) || String(b.code).localeCompare(String(a.code), undefined, { numeric: true }))
    }
  ];

  const seen = new Set();
  const scenarios = strategies
    .map((strategy) => buildScenarioFromOrder({
      futureModules,
      completedCredits,
      completedQualityPoints,
      neededFutureQualityPoints,
      strategy
    }))
    .filter((scenario) => {
      const key = scenario.assignments.map((item) => `${item.code}:${item.suggestedGrade}`).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    possible: scenarios.length > 0,
    message: scenarios.length > 0
      ? `Generated ${scenarios.length} different route(s) to ${target.toFixed(2)}.`
      : 'No distinct permutations could be generated.',
    scenarios
  };
}

function compareCourses(a, b, sortBy) {
  if (sortBy === 'credits') {
    return Number(a.credits || 0) - Number(b.credits || 0);
  }

  if (sortBy === 'grade') {
    return (gradeRank[a.grade] ?? 99) - (gradeRank[b.grade] ?? 99);
  }

  const field = sortBy === 'semester' ? 'academicYear' : sortBy;
  return String(a[field] || '').localeCompare(String(b[field] || ''), undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}

function sortSemesterLabels(labels) {
  return [...labels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function groupCoursesBySemester(courses) {
  const groups = new Map();
  courses.forEach((course) => {
    const label = course.academicYear || 'Unscheduled';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(course);
  });
  return sortSemesterLabels([...groups.keys()]).map((label) => ({ label, courses: groups.get(label) }));
}

function calculateLocalSummary(modules) {
  const counted = modules
    .filter((module) => module.status === 'Completed' && gradePoints[module.grade] !== undefined)
    .map((module) => ({ ...module, credits: Number(module.credits || 0), gradePoint: gradePoints[module.grade] }));

  const creditsAttempted = counted.reduce((sum, module) => sum + module.credits, 0);
  const qualityPoints = counted.reduce((sum, module) => sum + module.credits * module.gradePoint, 0);

  const summary = {
    gpa: creditsAttempted > 0 ? Number((qualityPoints / creditsAttempted).toFixed(2)) : 0,
    creditsAttempted,
    creditsCompleted: modules
      .filter((module) => module.status === 'Completed')
      .reduce((sum, module) => sum + Number(module.credits || 0), 0)
  };

  const primaryModules = modules.filter((module) => ['primary', 'shared', undefined, null, ''].includes(module.gpaBucket));
  const secondaryModules = modules.filter((module) => ['secondary', 'shared'].includes(module.gpaBucket));
  return {
    ...summary,
    buckets: {
      primary: calculateLocalSummaryBase(primaryModules),
      secondary: calculateLocalSummaryBase(secondaryModules),
      unassignedCount: modules.filter((module) => module.gpaBucket === 'unassigned').length
    }
  };
}

function calculateLocalSummaryBase(modules) {
  const counted = modules
    .filter((module) => module.status === 'Completed' && gradePoints[module.grade] !== undefined)
    .map((module) => ({ ...module, credits: Number(module.credits || 0), gradePoint: gradePoints[module.grade] }));
  const creditsAttempted = counted.reduce((sum, module) => sum + module.credits, 0);
  const qualityPoints = counted.reduce((sum, module) => sum + module.credits * module.gradePoint, 0);

  return {
    gpa: creditsAttempted > 0 ? Number((qualityPoints / creditsAttempted).toFixed(2)) : 0,
    creditsAttempted,
    creditsCompleted: modules
      .filter((module) => module.status === 'Completed')
      .reduce((sum, module) => sum + Number(module.credits || 0), 0)
  };
}

function GpaTrio({ title, badge, gpaValue, credits, target, onTargetChange, requiredPlan, selected, onSelect, goalSubtitle, onSelectPlan, planSelected }) {
  const pct = Math.min(100, Math.max(0, (gpaValue / 5) * 100));
  const tickDeg = (Math.min(5, Math.max(0, target)) / 5) * 360;
  const ringColor = !requiredPlan.possible
    ? 'var(--color-danger)'
    : gpaValue >= target
      ? 'var(--color-success)'
      : 'var(--color-primary)';
  const honours = getHonoursTier(gpaValue);

  return (
    <div className="gpa-trio">
      <button
        className={`stat-card stat-card-button gpa-hero ${selected ? 'selected' : ''}`}
        type="button"
        onClick={onSelect}
      >
        <div className="stat-header">
          <span className="stat-label">{title}</span>
          <span className="stat-icon">{badge}</span>
        </div>
        <div className="gpa-hero-body">
          <div className="gpa-ring" style={{ '--pct': pct, '--ring-color': ringColor }}>
            <div className="gpa-ring-tick-wrap" style={{ '--tick-deg': `${tickDeg}deg` }}>
              <span className="gpa-ring-tick" title={`Goal ${target.toFixed(2)}`} />
            </div>
            <div className="gpa-ring-value">
              <strong>{gpaValue.toFixed(2)}</strong>
              <span>/ 5.00</span>
            </div>
          </div>
          <div className="gpa-hero-text">
            {credits > 0 && (
              <span className={`honours-badge tier-${honours.tier}`}>{honours.label}</span>
            )}
            <div className="gpa-hero-credits">{credits} completed credits</div>
            <div className={`gpa-hero-delta ${gpaValue >= target ? 'positive' : 'negative'}`}>
              {formatGpaDelta(gpaValue, target)}
            </div>
          </div>
        </div>
      </button>

      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Set goal</span>
          <span className="stat-icon">Target</span>
        </div>
        <div className="stat-value">{target.toFixed(2)}</div>
        <div className="stat-subtitle">{goalSubtitle}</div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.01"
          value={target}
          onChange={(event) => onTargetChange(parseFloat(event.target.value))}
          className="gpa-slider"
        />
        <div className="slider-labels">
          <span>0.0</span>
          <span>5.0</span>
        </div>
      </div>

      <button
        type="button"
        className={`stat-card stat-card-button ${!requiredPlan.possible ? 'alert' : ''} ${planSelected ? 'selected' : ''}`}
        onClick={onSelectPlan}
      >
        <div className="stat-header">
          <span className="stat-label">Required average</span>
          <span className="stat-icon">Future</span>
        </div>
        <div className="stat-value">{(requiredPlan.requiredAverageGradePoint || 0).toFixed(2)}</div>
        <div className={`stat-subtitle ${!requiredPlan.possible ? 'alert-text' : ''}`}>
          {requiredPlan.message}
        </div>
        <div className="remaining-credits">Remaining credits: {requiredPlan.futureCredits}</div>
      </button>
    </div>
  );
}

function DashboardPage() {
  const [user, setUser] = useState(getStoredUser);
  const [targetGPA, setTargetGPA] = useState(3.5);
  const [primaryTargetGPA, setPrimaryTargetGPA] = useState(3.5);
  const [secondaryTargetGPA, setSecondaryTargetGPA] = useState(3.5);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState({ gpa: 0, creditsAttempted: 0, creditsCompleted: 0 });
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('All Courses');
  const [moduleView, setModuleView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedGpaBucket, setSelectedGpaBucket] = useState('');
  const [gradePlanBucket, setGradePlanBucket] = useState('overall');
  const [gradePlanOpen, setGradePlanOpen] = useState(false);
  const [fgoCaps] = useState(() => fgoSchemes[localStorage.getItem('fgo_scheme') || '24au'] || fgoSchemes['24au']);
  const [fgoView, setFgoView] = useState({ overall: false, primary: false, secondary: false });
  const [newModule, setNewModule] = useState(emptyModule);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCurriculumFile, setSelectedCurriculumFile] = useState(null);
  const [selectedGpaMappingFile, setSelectedGpaMappingFile] = useState(null);
  const [dragOverTranscript, setDragOverTranscript] = useState(false);
  const [dragOverCurriculum, setDragOverCurriculum] = useState(false);
  const [dragOverMapping, setDragOverMapping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCurriculum, setUploadingCurriculum] = useState(false);
  const [mappingBusy, setMappingBusy] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState('');
  const [editableCell, setEditableCell] = useState(null);
  const [removingModuleId, setRemovingModuleId] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isGuest] = useState(isGuestSession);
  const addModuleCodeInputRef = useRef(null);
  const pendingResyncRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (isGuest) {
      const localCourses = JSON.parse(localStorage.getItem('guest_modules') || '[]');
      setCourses(localCourses);
      setSummary(calculateLocalSummary(localCourses));
      setMessage('Guest mode is local only. Sign up or log in to save modules and import PDF transcripts.');
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchAcademicModules();
      setCourses(data.modules || []);
      setSummary(data.summary || { gpa: 0, creditsAttempted: 0, creditsCompleted: 0 });
      if (data.user) {
        const nextUser = {
          id: data.user._id || data.user.id,
          name: data.user.name,
          email: data.user.email,
          school: data.user.school,
          course: data.user.course,
          isDoubleDegree: Boolean(data.user.isDoubleDegree),
          primaryDegreeName: data.user.primaryDegreeName || data.user.course || '',
          secondaryDegreeName: data.user.secondaryDegreeName || ''
        };
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
        setUser(nextUser);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  const refreshPlan = useCallback(async () => {
    if (isGuest) {
      setPlan(null);
      return;
    }

    try {
      const data = await buildGradePlan(targetGPA);
      setPlan(data);
    } catch (err) {
      setPlan(null);
      setError(err.message);
    }
  }, [isGuest, targetGPA]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (courses.length > 0) refreshPlan();
  }, [refreshPlan, courses]);

  useEffect(() => {
    if (editableCell === null && pendingResyncRef.current) {
      pendingResyncRef.current = false;
      loadDashboard();
    }
  }, [editableCell, loadDashboard]);

  useEffect(() => {
    if (addModuleOpen) {
      addModuleCodeInputRef.current?.focus();
    }
  }, [addModuleOpen]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  const filteredCourses = useMemo(() => {
    return getTabCourses(courses, activeTab);
  }, [activeTab, courses]);

  const searchFilteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredCourses;
    return filteredCourses.filter((course) =>
      String(course.code || '').toLowerCase().includes(query) ||
      String(course.name || '').toLowerCase().includes(query)
    );
  }, [filteredCourses, searchQuery]);

  const sortedCourses = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...searchFilteredCourses].sort((a, b) => direction * compareCourses(a, b, sortBy));
  }, [searchFilteredCourses, sortBy, sortDirection]);

  const semesterGroups = useMemo(() => groupCoursesBySemester(sortedCourses), [sortedCourses]);

  const tabCredits = useMemo(() => {
    return tabOptions.reduce((totals, tab) => ({
      ...totals,
      [tab]: sumCredits(getTabCourses(courses, tab))
    }), {});
  }, [courses]);

  const remainingCredits = useMemo(
    () => courses
      .filter((course) => ['Planned', 'In Progress'].includes(course.status))
      .reduce((sum, course) => sum + Number(course.credits || 0), 0),
    [courses]
  );

  const handleTranscriptUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return setError('Choose a PDF transcript first.');
    if (isGuest) return setError('PDF transcript import needs an account. Please sign up or log in first.');

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const data = await uploadTranscript(selectedFile);
      setCourses(data.modules || []);
      setSummary(data.summary || summary);
      setMessage(`Imported ${data.importedModules?.length || data.detectedCount || 0} module(s) from ${selectedFile.name}.`);
      setSelectedFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCurriculumUpload = async (event) => {
    event.preventDefault();
    if (!selectedCurriculumFile) return setError('Choose a curriculum PDF first.');
    if (isGuest) return setError('Curriculum import needs an account. Please sign up or log in first.');

    setUploadingCurriculum(true);
    setMessage('');
    setError('');

    try {
      const data = await uploadCurriculum(selectedCurriculumFile);
      setCourses(data.modules || []);
      setSummary(data.summary || summary);
      setMessage(`Imported ${data.importedModules?.length || 0} planned module(s). Skipped ${data.skippedModules?.length || 0} existing module(s).`);
      setSelectedCurriculumFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingCurriculum(false);
    }
  };

  const handleGpaMappingUpload = async (event) => {
    event.preventDefault();
    if (!selectedGpaMappingFile) return setError('Choose a GPA mapping document first.');
    if (isGuest) return setError('GPA mapping import needs an account. Please sign up or log in first.');

    setMappingBusy(true);
    setMessage('');
    setError('');

    try {
      const data = await uploadGpaMapping(selectedGpaMappingFile);
      setCourses(data.modules || []);
      setSummary(data.summary || summary);
      setSelectedGpaMappingFile(null);
      setMessage(`Applied GPA mapping. Detected ${data.detectedCodes || 0} course code(s) in the document.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setMappingBusy(false);
    }
  };

  const handlePredictGpaBuckets = async () => {
    if (isGuest) return setError('GPA prediction needs an account. Please sign up or log in first.');

    setMappingBusy(true);
    setMessage('');
    setError('');

    try {
      const data = await predictGpaBuckets();
      setCourses(data.modules || []);
      setSummary(data.summary || summary);
      setMessage(data.message || 'Predicted GPA categories.');
    } catch (err) {
      setError(err.message);
    } finally {
      setMappingBusy(false);
    }
  };

  const handleAddModule = async () => {
    setSavingModule(true);
    setMessage('');
    setError('');

    try {
      if (isGuest) {
        const guestModule = {
          ...newModule,
          _id: `guest-${Date.now()}`,
          code: newModule.code.toUpperCase()
        };
        const nextCourses = [...courses, guestModule];
        localStorage.setItem('guest_modules', JSON.stringify(nextCourses));
        setCourses(nextCourses);
        setSummary(calculateLocalSummary(nextCourses));
        setNewModule({ ...emptyModule, academicYear: newModule.academicYear });
        setAddModuleOpen(false);
        setMessage('Module saved locally for this guest session.');
        return;
      }

      await addAcademicModule(newModule);
      setNewModule({ ...emptyModule, academicYear: newModule.academicYear });
      setAddModuleOpen(false);
      setMessage('Module saved.');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingModule(false);
    }
  };

  const handleModuleFieldChange = async (course, field, value) => {
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    if (['code', 'name'].includes(field) && !trimmedValue) {
      await loadDashboard();
      setEditableCell(null);
      return setError(`${field === 'code' ? 'Code' : 'Course name'} cannot be empty.`);
    }

    if (field === 'credits' && (!Number(trimmedValue) || Number(trimmedValue) <= 0)) {
      await loadDashboard();
      setEditableCell(null);
      return setError('Credits must be greater than zero.');
    }

    const updatedCourse = {
      ...course,
      [field]: field === 'credits' ? Number(trimmedValue) : trimmedValue
    };

    if (field === 'code') {
      updatedCourse.code = trimmedValue.toUpperCase();
    }

    if (field === 'status' && value !== 'Completed' && !course.grade) {
      updatedCourse.grade = '-';
    }

    const nextCourses = courses.map((item) =>
      (item._id || `${item.code}-${item.academicYear}`) === (course._id || `${course.code}-${course.academicYear}`)
        ? updatedCourse
        : item
    );

    setCourses(nextCourses);
    setSummary(calculateLocalSummary(nextCourses));
    setMessage('');
    setError('');

    if (isGuest) {
      localStorage.setItem('guest_modules', JSON.stringify(nextCourses));
      setMessage('Module updated locally.');
      return;
    }

    const editedCourseKey = course._id || `${course.code}-${course.academicYear}`;
    setEditingModuleId(course._id || course.code);

    try {
      await updateAcademicModule(updatedCourse);
      pendingResyncRef.current = true;
      setMessage('Module updated.');
    } catch (err) {
      setError(err.message);
      pendingResyncRef.current = false;
      await loadDashboard();
    } finally {
      setEditingModuleId('');
      setEditableCell((current) =>
        current && current.courseKey === editedCourseKey && current.field === field ? null : current
      );
    }
  };

  const updateLocalCourseField = (course, field, value) => {
    const courseKey = course._id || `${course.code}-${course.academicYear}`;
    const nextCourses = courses.map((item) =>
      (item._id || `${item.code}-${item.academicYear}`) === courseKey
        ? { ...item, [field]: field === 'code' ? value.toUpperCase() : value }
        : item
    );
    setCourses(nextCourses);
  };

  const renderEditableTextCell = (course, field, className = '') => {
    const courseKey = course._id || `${course.code}-${course.academicYear}`;
    const isEditing = editableCell?.courseKey === courseKey && editableCell?.field === field;
    const value = course[field];

    if (!isEditing) {
      return (
        <span
          className={`editable-cell ${className}`}
          title="Click to edit"
          onClick={() => setEditableCell({ courseKey, field })}
        >
          {value}
        </span>
      );
    }

    return (
      <input
        className={`table-input ${className}`}
        autoFocus
        type={field === 'credits' ? 'number' : 'text'}
        min={field === 'credits' ? '0.5' : undefined}
        step={field === 'credits' ? '0.5' : undefined}
        value={value}
        disabled={editingModuleId === (course._id || course.code)}
        onChange={(event) => updateLocalCourseField(course, field, event.target.value)}
        onBlur={(event) => handleModuleFieldChange(course, field, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setEditableCell(null);
            loadDashboard();
          }
        }}
      />
    );
  };

  const renderEditableSelectCell = (course, field, options, className = '') => {
    const courseKey = course._id || `${course.code}-${course.academicYear}`;
    const isEditing = editableCell?.courseKey === courseKey && editableCell?.field === field;
    const value = course[field] || (field === 'grade' ? '-' : field === 'gpaBucket' ? 'primary' : 'Planned');

    if (!isEditing) {
      const displayClass = field === 'status'
        ? `status-badge ${String(value).toLowerCase().replace(/\s+/g, '-')}`
        : field === 'gpaBucket'
          ? `gpa-bucket-select ${className}`
          : `grade-badge grade-tier-${getGradeTier(value)} ${className}`;
      return (
        <span
          className={`editable-cell ${displayClass}`}
          title="Click to edit"
          onClick={() => setEditableCell({ courseKey, field })}
        >
          {value}
        </span>
      );
    }

    return (
      <select
        className={`table-select ${className} ${field === 'grade' ? `grade-tier-${getGradeTier(value)}` : ''}`}
        autoFocus
        value={value}
        disabled={editingModuleId === (course._id || course.code)}
        onChange={(event) => updateLocalCourseField(course, field, event.target.value)}
        onBlur={(event) => handleModuleFieldChange(course, field, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setEditableCell(null);
            loadDashboard();
          }
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  };

  const renderInlineTextInput = (course, field, className = '') => (
    <input
      className={`table-input ${className}`}
      type={field === 'credits' ? 'number' : 'text'}
      min={field === 'credits' ? '0.5' : undefined}
      step={field === 'credits' ? '0.5' : undefined}
      value={course[field]}
      disabled={editingModuleId === (course._id || course.code)}
      onChange={(event) => updateLocalCourseField(course, field, event.target.value)}
      onBlur={(event) => handleModuleFieldChange(course, field, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') loadDashboard();
      }}
    />
  );

  const renderInlineSelect = (course, field, options, className = '') => {
    const value = course[field] || (field === 'grade' ? '-' : field === 'gpaBucket' ? 'primary' : 'Planned');

    return (
      <select
        className={`table-select ${className} ${field === 'grade' ? `grade-tier-${getGradeTier(value)}` : ''}`}
        value={value}
        disabled={editingModuleId === (course._id || course.code)}
        onChange={(event) => handleModuleFieldChange(course, field, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  };

  const renderBdeCheckbox = (course) => {
    const checked = Boolean(course.isBde || course.moduleCategory === 'BDE');

    return (
      <label className="table-checkbox">
        <input
          type="checkbox"
          checked={checked}
          disabled={editingModuleId === (course._id || course.code)}
          onChange={(event) => handleModuleFieldChange(course, 'isBde', event.target.checked)}
        />
        <span>BDE</span>
      </label>
    );
  };

  const renderTableHead = () => (
    <thead>
      <tr>
        <th>Code</th>
        <th>Course Name</th>
        <th>Credits</th>
        <th>BDE</th>
        <th>Grade</th>
        <th>Status</th>
        {doubleDegree && <th>GPA</th>}
        <th>Actions</th>
      </tr>
    </thead>
  );

  const renderCourseRow = (course) => (
    <tr key={course._id || `${course.code}-${course.academicYear}`}>
      <td data-label="Code">{renderEditableTextCell(course, 'code', 'code-input')}</td>
      <td data-label="Course Name">{renderEditableTextCell(course, 'name', 'name-input')}</td>
      <td data-label="Credits">{renderEditableTextCell(course, 'credits', 'credits-input')}</td>
      <td data-label="BDE">{renderBdeCheckbox(course)}</td>
      <td data-label="Grade">{renderEditableSelectCell(course, 'grade', gradeOptions, 'grade-select')}</td>
      <td data-label="Status">{renderEditableSelectCell(course, 'status', statusOptions, `status-select ${String(course.status).toLowerCase().replace(/\s+/g, '-')}`)}</td>
      {doubleDegree && (
        <td data-label="GPA">{renderEditableSelectCell(course, 'gpaBucket', gpaBucketOptions, 'gpa-bucket-select')}</td>
      )}
      <td data-label="Actions">
        <button
          className="row-delete-button"
          type="button"
          disabled={removingModuleId === (course._id || `${course.code}-${course.academicYear}`)}
          onClick={() => handleRemoveModule(course)}
        >
          {removingModuleId === (course._id || `${course.code}-${course.academicYear}`) ? 'Removing...' : 'Remove'}
        </button>
      </td>
    </tr>
  );

  const renderEmptyModulesRow = () => (
    <tr>
      <td colSpan={doubleDegree ? '8' : '7'} className="empty-table">
        {courses.length === 0 ? (
          <div className="empty-state">
            <p>No modules yet.</p>
            <span>Import a transcript or add your first module to get started.</span>
            <button type="button" className="btn-primary" onClick={handleFocusAddModule}>
              Add your first module
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <p>No modules match this view.</p>
            <span>Try a different search term or switch tabs.</span>
            <button type="button" className="btn-secondary" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  const handleRemoveModule = async (course) => {
    const courseKey = course._id || `${course.code}-${course.academicYear}`;
    const nextCourses = courses.filter((item) =>
      (item._id || `${item.code}-${item.academicYear}`) !== courseKey
    );

    setMessage('');
    setError('');

    if (isGuest) {
      localStorage.setItem('guest_modules', JSON.stringify(nextCourses));
      setCourses(nextCourses);
      setSummary(calculateLocalSummary(nextCourses));
      setMessage('Module removed locally.');
      return;
    }

    setRemovingModuleId(courseKey);

    try {
      await deleteAcademicModule(course._id);
      await loadDashboard();
      setMessage('Module removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingModuleId('');
    }
  };

  const openClearConfirm = () => {
    if (courses.length === 0) return;
    setConfirmClearOpen(true);
  };

  const handleConfirmClearModules = async () => {
    setConfirmClearOpen(false);
    setMessage('');
    setError('');

    if (isGuest) {
      localStorage.removeItem('guest_modules');
      setCourses([]);
      setSummary(calculateLocalSummary([]));
      setPlan(null);
      setMessage('All local modules cleared.');
      return;
    }

    setLoading(true);

    try {
      await clearAcademicModules();
      setCourses([]);
      setSummary(calculateLocalSummary([]));
      setPlan(null);
      setMessage('All modules cleared.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFocusAddModule = () => {
    setAddModuleOpen(true);
  };

  const handleCancelAddModule = () => {
    setAddModuleOpen(false);
    setNewModule({ ...emptyModule, academicYear: newModule.academicYear });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveTab('All Courses');
  };

  const buildDropHandlers = (setFile, setDragActive) => ({
    onDragOver: (event) => { event.preventDefault(); setDragActive(true); },
    onDragEnter: (event) => { event.preventDefault(); setDragActive(true); },
    onDragLeave: () => setDragActive(false),
    onDrop: (event) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) setFile(file);
    }
  });

  const currentGPA = Number(summary.gpa || 0);
  const doubleDegree = Boolean(user?.isDoubleDegree || summary.doubleDegree);
  const degreeNames = summary.degreeNames || {
    primary: user?.primaryDegreeName || user?.course || 'Degree 1',
    secondary: user?.secondaryDegreeName || 'Degree 2'
  };
  const activeSummaryBucket = doubleDegree ? (selectedGpaBucket === 'secondary' ? 'secondary' : 'primary') : 'overall';
  const currentSummaryGpa = doubleDegree
    ? Number(summary.buckets?.[activeSummaryBucket]?.gpa || 0)
    : currentGPA;
  const currentSummaryCredits = doubleDegree
    ? summary.buckets?.[activeSummaryBucket]?.creditsCompleted || 0
    : summary.creditsCompleted || 0;

  const primaryFgoPlan = useMemo(
    () => optimiseFgo(courses, true, 'primary', fgoCaps.coreCap, fgoCaps.bdeCap),
    [courses, fgoCaps]
  );
  const secondaryFgoPlan = useMemo(
    () => optimiseFgo(courses, true, 'secondary', fgoCaps.coreCap, fgoCaps.bdeCap),
    [courses, fgoCaps]
  );
  const overallFgoPlan = useMemo(
    () => optimiseFgo(courses, false, 'primary', fgoCaps.coreCap, fgoCaps.bdeCap),
    [courses, fgoCaps]
  );
  const primaryExcludedKeys = useMemo(
    () => (fgoView.primary ? new Set(primaryFgoPlan.selectedModules.map(moduleKey)) : new Set()),
    [fgoView.primary, primaryFgoPlan]
  );
  const secondaryExcludedKeys = useMemo(
    () => (fgoView.secondary ? new Set(secondaryFgoPlan.selectedModules.map(moduleKey)) : new Set()),
    [fgoView.secondary, secondaryFgoPlan]
  );
  const overallExcludedKeys = useMemo(
    () => (fgoView.overall ? new Set(overallFgoPlan.selectedModules.map(moduleKey)) : new Set()),
    [fgoView.overall, overallFgoPlan]
  );

  const primaryRequiredPlan = useMemo(
    () => buildRequiredAverageForGpa(courses, 'primary', primaryTargetGPA, primaryExcludedKeys),
    [courses, primaryTargetGPA, primaryExcludedKeys]
  );
  const secondaryRequiredPlan = useMemo(
    () => buildRequiredAverageForGpa(courses, 'secondary', secondaryTargetGPA, secondaryExcludedKeys),
    [courses, secondaryTargetGPA, secondaryExcludedKeys]
  );
  const overallRequiredPlan = useMemo(
    () => buildRequiredAverageForGpa(courses, 'primary', targetGPA, overallExcludedKeys),
    [courses, targetGPA, overallExcludedKeys]
  );

  const selectedGpaMeta = {
    overall: { title: 'Current GPA', label: 'Overall' },
    primary: { title: `${degreeNames.primary} GPA`, label: 'Degree 1' },
    secondary: { title: `${degreeNames.secondary} GPA`, label: 'Degree 2' }
  }[selectedGpaBucket];
  const selectedGpaCourses = selectedGpaBucket
    ? getCoursesForGpa(courses, selectedGpaBucket)
        .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    : [];
  const requiredAverage = Number(plan?.requiredAverageGradePoint || 0);
  const isPlanImpossible = plan && !plan.possible;
  const summaryRequiredPlan = doubleDegree
    ? (activeSummaryBucket === 'secondary' ? secondaryRequiredPlan : primaryRequiredPlan)
    : fgoView.overall
      ? overallRequiredPlan
      : {
          requiredAverageGradePoint: requiredAverage,
          futureCredits: remainingCredits,
          possible: !isPlanImpossible,
          message: plan?.message || 'Add planned modules to calculate this.'
        };
  const gradePlanTargetGPA = gradePlanBucket === 'primary'
    ? primaryTargetGPA
    : gradePlanBucket === 'secondary'
      ? secondaryTargetGPA
      : targetGPA;
  const gradePlanExcludedKeys = gradePlanBucket === 'primary'
    ? primaryExcludedKeys
    : gradePlanBucket === 'secondary'
      ? secondaryExcludedKeys
      : overallExcludedKeys;
  const gradePlanPermutations = useMemo(
    () => generateGradePlanPermutations(courses, gradePlanBucket, gradePlanTargetGPA, gradePlanExcludedKeys),
    [courses, gradePlanBucket, gradePlanTargetGPA, gradePlanExcludedKeys]
  );

  const gpaDetailPanel = selectedGpaMeta && (
    <section className="gpa-detail-panel">
      <div className="section-header">
        <div>
          <h2>{selectedGpaMeta.title}</h2>
          <p>{selectedGpaMeta.label} courses included in this GPA calculation.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={() => setSelectedGpaBucket('')}>
          Close
        </button>
      </div>
      <div className="table-wrap">
        <table className="courses-table compact-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>BDE</th>
              <th>Grade</th>
              <th>Status</th>
              {doubleDegree && <th>GPA Category</th>}
            </tr>
          </thead>
          <tbody>
            {selectedGpaCourses.map((course) => (
              <tr key={`gpa-${selectedGpaBucket}-${course._id || `${course.code}-${course.academicYear}`}`}>
                <td data-label="Code">{renderInlineTextInput(course, 'code', 'code-input')}</td>
                <td data-label="Course Name">{renderInlineTextInput(course, 'name', 'name-input')}</td>
                <td data-label="Credits">{renderInlineTextInput(course, 'credits', 'credits-input')}</td>
                <td data-label="BDE">{renderBdeCheckbox(course)}</td>
                <td data-label="Grade">{renderInlineSelect(course, 'grade', gradeOptions, 'grade-select')}</td>
                <td data-label="Status">{renderInlineSelect(course, 'status', statusOptions, `status-select ${String(course.status).toLowerCase().replace(/\s+/g, '-')}`)}</td>
                {doubleDegree && (
                  <td data-label="GPA Category">{renderInlineSelect(course, 'gpaBucket', gpaBucketOptions, 'gpa-bucket-select')}</td>
                )}
              </tr>
            ))}
            {selectedGpaCourses.length === 0 && (
              <tr>
                <td colSpan={doubleDegree ? '7' : '6'} className="empty-table">
                  No completed modules are assigned to this GPA yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const gradePlanPanel = gradePlanOpen && (
    <section className="gpa-detail-panel plan-panel">
      <div className="section-header">
        <div>
          <h2>Grade Plan Permutations</h2>
          <p>Suggested grade combinations for your remaining credits.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={() => setGradePlanOpen(false)}>
          Close
        </button>
      </div>
      <p>{gradePlanPermutations.message}</p>
      <div className="plan-scenarios">
        {gradePlanPermutations.scenarios.map((scenario) => (
          <article className="plan-scenario" key={scenario.name}>
            <div className="plan-scenario-header">
              <strong>{scenario.name}</strong>
              <span>Final GPA {scenario.finalGpa.toFixed(2)}</span>
            </div>
            <ul>
              {scenario.assignments.map((item) => (
                <li key={`${scenario.name}-${item.code}`}>
                  <span>{item.code}</span>
                  <strong>{item.suggestedGrade}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <span className="page-eyebrow">Academic overview</span>
            <div className="dashboard-title-row">
              <h1>Academic Dashboard</h1>
              {isGuest && <span className="guest-pill">Guest session — changes stay on this device</span>}
            </div>
            <p>Track completed modules, import transcripts, and plan the grades needed for your goal GPA.</p>
          </div>
        </header>

        {(message || error) && (
          <div className={`toast ${error ? 'toast-error' : 'toast-success'}`} role="status">
            <span className="toast-icon" aria-hidden="true">{error ? '!' : '✓'}</span>
            <span className="toast-text">{error || message}</span>
            <button
              className="toast-dismiss"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => (error ? setError('') : setMessage(''))}
            >
              &times;
            </button>
          </div>
        )}

        {doubleDegree ? (
          <div className="gpa-trio-stack">
            {['primary', 'secondary'].map((bucket) => {
              const name = bucket === 'primary' ? degreeNames.primary : degreeNames.secondary;
              const rawGpa = Number(summary.buckets?.[bucket]?.gpa || 0);
              const fgoPlan = bucket === 'primary' ? primaryFgoPlan : secondaryFgoPlan;
              const current = fgoView[bucket] ? fgoPlan.projectedGpa : rawGpa;
              const credits = summary.buckets?.[bucket]?.creditsCompleted || 0;
              const target = bucket === 'primary' ? primaryTargetGPA : secondaryTargetGPA;
              const setTarget = bucket === 'primary' ? setPrimaryTargetGPA : setSecondaryTargetGPA;
              const requiredPlan = bucket === 'primary' ? primaryRequiredPlan : secondaryRequiredPlan;

              return (
                <section className="degree-group" key={bucket}>
                  <header className="degree-group-header">
                    <div className="degree-group-title">
                      <h2>{name}</h2>
                      <span className="degree-group-tag">Degree {bucket === 'primary' ? '1' : '2'}</span>
                    </div>
                    <button
                      type="button"
                      className={`fgo-projection-toggle ${fgoView[bucket] ? 'active' : ''}`}
                      onClick={() => setFgoView((v) => ({ ...v, [bucket]: !v[bucket] }))}
                      title={`Projected GPA after best-case FGO (${fgoCaps.label} scheme)`}
                    >
                      After FGO
                    </button>
                  </header>
                  <GpaTrio
                    title={`${name} GPA`}
                    badge={`Degree ${bucket === 'primary' ? '1' : '2'}`}
                    gpaValue={current}
                    credits={credits}
                    target={target}
                    onTargetChange={setTarget}
                    requiredPlan={requiredPlan}
                    selected={selectedGpaBucket === bucket}
                    onSelect={() => setSelectedGpaBucket((current) => current === bucket ? '' : bucket)}
                    goalSubtitle={`Desired cumulative GPA for ${name}`}
                    onSelectPlan={() => {
                      setGradePlanBucket(bucket);
                      setGradePlanOpen((current) => (current && gradePlanBucket === bucket) ? false : true);
                    }}
                    planSelected={gradePlanOpen && gradePlanBucket === bucket}
                  />
                  {selectedGpaBucket === bucket && gpaDetailPanel}
                  {gradePlanBucket === bucket && gradePlanPanel}
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <header className="degree-group-header">
              <div className="degree-group-title">
                <h2>{degreeNames.primary}</h2>
              </div>
              <button
                type="button"
                className={`fgo-projection-toggle ${fgoView.overall ? 'active' : ''}`}
                onClick={() => setFgoView((v) => ({ ...v, overall: !v.overall }))}
                title={`Projected GPA after best-case FGO (${fgoCaps.label} scheme)`}
              >
                After FGO
              </button>
            </header>
            <GpaTrio
              title="Current GPA"
              badge={isGuest ? 'Guest' : '5.0 scale'}
              gpaValue={fgoView.overall ? overallFgoPlan.projectedGpa : currentSummaryGpa}
              credits={currentSummaryCredits}
              target={targetGPA}
              onTargetChange={setTargetGPA}
              requiredPlan={summaryRequiredPlan}
              selected={selectedGpaBucket === activeSummaryBucket}
              onSelect={() => setSelectedGpaBucket((current) => current === activeSummaryBucket ? '' : activeSummaryBucket)}
              goalSubtitle="Desired cumulative GPA"
              onSelectPlan={() => setGradePlanOpen((current) => !current)}
              planSelected={gradePlanOpen}
            />
            {gpaDetailPanel}
            {gradePlanPanel}
          </>
        )}

        <div className="dashboard-grid">
          <section className="courses-section">
            <div className="section-header">
              <h2>Modules & Courses</h2>
              <div className="section-actions">
                <button className="btn-primary" type="button" onClick={() => setAddModuleOpen(true)}>
                  + Add Module
                </button>
                <button className="btn-danger" type="button" onClick={openClearConfirm} disabled={loading || courses.length === 0}>
                  Clear All
                </button>
              </div>
            </div>

            <div className="view-toggle">
              <button
                type="button"
                className={`view-toggle-option ${moduleView === 'all' ? 'active' : ''}`}
                onClick={() => setModuleView('all')}
              >
                All Modules
              </button>
              <button
                type="button"
                className={`view-toggle-option ${moduleView === 'semester' ? 'active' : ''}`}
                onClick={() => setModuleView('semester')}
              >
                Modules by Semester
              </button>
            </div>

            <div className="tabs">
              {tabOptions.map((tab) => (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{tab}</span>
                  <span className="tab-credit">{tabCredits[tab] || 0} AU</span>
                </button>
              ))}
            </div>

            <div className="table-toolbar">
              <label className="search-control">
                <span className="search-icon" aria-hidden="true">&#8981;</span>
                <input
                  type="text"
                  placeholder="Search by code or name"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                  >
                    &times;
                  </button>
                )}
              </label>
              <label className="sort-control">
                Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="code">Course code</option>
                  <option value="name">Course name</option>
                  <option value="grade">Grade</option>
                  <option value="semester">Semester</option>
                  <option value="credits">Credits</option>
                </select>
              </label>
              <button
                className="sort-direction-button"
                type="button"
                onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            {moduleView === 'all' ? (
              <div className="table-wrap">
                <table className="courses-table">
                  {renderTableHead()}
                  <tbody>
                    {sortedCourses.map(renderCourseRow)}
                    {sortedCourses.length === 0 && renderEmptyModulesRow()}
                  </tbody>
                </table>
              </div>
            ) : semesterGroups.length === 0 ? (
              <div className="table-wrap">
                <table className="courses-table">
                  {renderTableHead()}
                  <tbody>{renderEmptyModulesRow()}</tbody>
                </table>
              </div>
            ) : (
              semesterGroups.map(({ label, courses: semesterCourses }) => {
                const semesterSummary = calculateLocalSummaryBase(semesterCourses);
                return (
                  <section className="semester-block" key={label}>
                    <div className="semester-block-header">
                      <h3>{label}</h3>
                      <div className="semester-block-stats">
                        <span>{semesterSummary.creditsAttempted} AU earned</span>
                        <span>GPA: <strong>{semesterSummary.gpa.toFixed(2)}</strong></span>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="courses-table">
                        {renderTableHead()}
                        <tbody>{semesterCourses.map(renderCourseRow)}</tbody>
                      </table>
                    </div>
                  </section>
                );
              })
            )}
          </section>

          <aside className="side-stack">
            <section className="side-panel">
              <h3>Import Transcript</h3>
              <form className="upload-box" onSubmit={handleTranscriptUpload}>
              <label
                className={`file-picker ${dragOverTranscript ? 'drag-active' : ''}`}
                {...buildDropHandlers(setSelectedFile, setDragOverTranscript)}
              >
                <input
                  type="file"
                  accept="application/pdf,text/plain,.pdf,.txt"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <span>{selectedFile ? selectedFile.name : 'Choose or drop a PDF transcript'}</span>
              </label>
              <button className="btn-primary" type="submit" disabled={uploading || isGuest}>
                {uploading ? 'Importing...' : isGuest ? 'Log in to Import' : 'Import Transcript'}
              </button>
              </form>
            </section>

            <section className="side-panel">
              <h3>Import Curriculum Structure</h3>
              <form className="upload-box" onSubmit={handleCurriculumUpload}>
                <label
                  className={`file-picker ${dragOverCurriculum ? 'drag-active' : ''}`}
                  {...buildDropHandlers(setSelectedCurriculumFile, setDragOverCurriculum)}
                >
                  <input
                    type="file"
                    accept="application/pdf,text/plain,.pdf,.txt"
                    onChange={(event) => setSelectedCurriculumFile(event.target.files?.[0] || null)}
                  />
                  <span>{selectedCurriculumFile ? selectedCurriculumFile.name : 'Choose or drop a curriculum PDF'}</span>
                </label>
                <button className="btn-primary" type="submit" disabled={uploadingCurriculum || isGuest}>
                  {uploadingCurriculum ? 'Importing...' : isGuest ? 'Log in to Import' : 'Import Curriculum'}
                </button>
              </form>
            </section>

            {doubleDegree && (
              <section className="side-panel">
                <h3>Double Degree GPA Mapping</h3>
                <p className="panel-note">Let GPAce predict categories, or upload a document that lists which courses count toward each degree GPA.</p>
                <button className="btn-secondary full-width-button" type="button" onClick={handlePredictGpaBuckets} disabled={mappingBusy || isGuest}>
                  {mappingBusy ? 'Working...' : 'Predict GPA Categories'}
                </button>
                <form className="upload-box" onSubmit={handleGpaMappingUpload}>
                  <label
                    className={`file-picker ${dragOverMapping ? 'drag-active' : ''}`}
                    {...buildDropHandlers(setSelectedGpaMappingFile, setDragOverMapping)}
                  >
                    <input
                      type="file"
                      accept="application/pdf,text/plain,.pdf,.txt"
                      onChange={(event) => setSelectedGpaMappingFile(event.target.files?.[0] || null)}
                    />
                    <span>{selectedGpaMappingFile ? selectedGpaMappingFile.name : 'Choose or drop a GPA mapping document'}</span>
                  </label>
                  <button className="btn-primary" type="submit" disabled={mappingBusy || isGuest}>
                    {mappingBusy ? 'Applying...' : 'Apply Mapping'}
                  </button>
                </form>
              </section>
            )}

          </aside>
        </div>
      </main>

      {addModuleOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={handleCancelAddModule}>
          <div className="modal-card modal-card-wide" onClick={(event) => event.stopPropagation()}>
            <h3>Add Module</h3>
            <p>Add a module to your course list.</p>
            <form className="module-form-grid" onSubmit={(event) => { event.preventDefault(); handleAddModule(); }}>
              <label className="form-label">
                Module code
                <input
                  ref={addModuleCodeInputRef}
                  className="form-input"
                  placeholder="e.g. CZ2001"
                  value={newModule.code}
                  onChange={(event) => setNewModule({ ...newModule, code: event.target.value })}
                />
              </label>
              <label className="form-label">
                Credits
                <input
                  className="form-input"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newModule.credits}
                  onChange={(event) => setNewModule({ ...newModule, credits: Number(event.target.value) })}
                />
              </label>
              <label className="form-label span-2">
                Module name
                <input
                  className="form-input"
                  placeholder="e.g. Algorithms"
                  value={newModule.name}
                  onChange={(event) => setNewModule({ ...newModule, name: event.target.value })}
                />
              </label>
              <label className="form-label">
                Academic year
                <select className="form-input" value={newModule.academicYear} onChange={(event) => setNewModule({ ...newModule, academicYear: event.target.value })}>
                  <option value="">Nil</option>
                  {academicYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Status
                <select
                  className="form-input"
                  value={newModule.status}
                  onChange={(event) => setNewModule({ ...newModule, status: event.target.value, grade: event.target.value === 'Completed' ? newModule.grade : '-' })}
                >
                  {statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              {newModule.status === 'Completed' && (
                <label className="form-label span-2">
                  Grade
                  <select className="form-input" value={newModule.grade} onChange={(event) => setNewModule({ ...newModule, grade: event.target.value })}>
                    {gradeOptions.filter((grade) => grade !== '-').map((grade) => (
                      <option key={grade}>{grade}</option>
                    ))}
                  </select>
                </label>
              )}
              {doubleDegree && (
                <label className="form-label span-2">
                  GPA category
                  <select className="form-input" value={newModule.gpaBucket} onChange={(event) => setNewModule({ ...newModule, gpaBucket: event.target.value })}>
                    {gpaBucketOptions.map((bucket) => (
                      <option key={bucket} value={bucket}>{bucket}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="form-checkbox span-2">
                <input
                  type="checkbox"
                  checked={newModule.isBde}
                  onChange={(event) => setNewModule({ ...newModule, isBde: event.target.checked })}
                />
                <span>Counts as a BDE module</span>
              </label>
            </form>
            <div className="modal-actions">
              <button className="btn-secondary" type="button" onClick={handleCancelAddModule}>
                Cancel
              </button>
              <button className="btn-primary" type="button" disabled={savingModule || !newModule.code.trim()} onClick={handleAddModule}>
                {savingModule ? 'Saving...' : 'Add Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClearOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmClearOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Clear all modules?</h3>
            <p>
              This removes all {courses.length} module{courses.length === 1 ? '' : 's'} {isGuest ? 'from this guest session' : 'from your account'}. This can&rsquo;t be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </button>
              <button className="btn-danger" type="button" onClick={handleConfirmClearModules} disabled={loading}>
                {loading ? 'Clearing...' : 'Clear all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
