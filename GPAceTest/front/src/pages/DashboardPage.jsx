import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../pages/DashboardPage.css';
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
import { clearSession, getDisplayName, getInitials, getStoredUser, isGuestSession } from '../services/session';

const emptyModule = {
  academicYear: '2025/2026',
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

function buildRequiredAverageForGpa(courses, bucket, targetGPA) {
  const bucketCourses = courses.filter((course) => moduleMatchesGpaBucket(course.gpaBucket, bucket));
  const completed = bucketCourses
    .filter((course) => course.status === 'Completed' && gradePoints[String(course.grade || '').toUpperCase()] !== undefined)
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

function generateGradePlanPermutations(courses, bucket, targetGPA) {
  const bucketCourses = getPlanCourses(courses, bucket);
  const completedModules = bucketCourses
    .filter((course) => course.status === 'Completed' && gradePoints[String(course.grade || '').toUpperCase()] !== undefined)
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

function DashboardPage() {
  const displayName = getDisplayName();
  const initials = getInitials(displayName);
  const [user, setUser] = useState(getStoredUser);
  const [targetGPA, setTargetGPA] = useState(3.5);
  const [primaryTargetGPA, setPrimaryTargetGPA] = useState(3.5);
  const [secondaryTargetGPA, setSecondaryTargetGPA] = useState(3.5);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState({ gpa: 0, creditsAttempted: 0, creditsCompleted: 0 });
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('All Courses');
  const [sortBy, setSortBy] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedGpaBucket, setSelectedGpaBucket] = useState('');
  const [gradePlanBucket, setGradePlanBucket] = useState('overall');
  const [newModule, setNewModule] = useState(emptyModule);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCurriculumFile, setSelectedCurriculumFile] = useState(null);
  const [selectedGpaMappingFile, setSelectedGpaMappingFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCurriculum, setUploadingCurriculum] = useState(false);
  const [mappingBusy, setMappingBusy] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState('');
  const [editableCell, setEditableCell] = useState(null);
  const [removingModuleId, setRemovingModuleId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isGuest] = useState(isGuestSession);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

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

  const filteredCourses = useMemo(() => {
    return getTabCourses(courses, activeTab);
  }, [activeTab, courses]);

  const sortedCourses = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filteredCourses].sort((a, b) => direction * compareCourses(a, b, sortBy));
  }, [filteredCourses, sortBy, sortDirection]);

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

  const handleAddModule = async (event) => {
    event.preventDefault();
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
        setMessage('Module saved locally for this guest session.');
        return;
      }

      await addAcademicModule(newModule);
      setNewModule({ ...emptyModule, academicYear: newModule.academicYear });
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

    setEditingModuleId(course._id || course.code);

    try {
      await updateAcademicModule(updatedCourse);
      await loadDashboard();
      setMessage('Module updated.');
    } catch (err) {
      setError(err.message);
      await loadDashboard();
    } finally {
      setEditingModuleId('');
      setEditableCell(null);
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
          title="Double-click to edit"
          onDoubleClick={() => setEditableCell({ courseKey, field })}
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
          : `grade-badge ${className}`;
      return (
        <span
          className={`editable-cell ${displayClass}`}
          title="Double-click to edit"
          onDoubleClick={() => setEditableCell({ courseKey, field })}
        >
          {value}
        </span>
      );
    }

    return (
      <select
        className={`table-select ${className}`}
        autoFocus
        value={value}
        disabled={editingModuleId === (course._id || course.code)}
        onChange={(event) => handleModuleFieldChange(course, field, event.target.value)}
        onBlur={() => setEditableCell(null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setEditableCell(null);
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
        className={`table-select ${className}`}
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

  const handleClearModules = async () => {
    if (courses.length === 0) return;

    const confirmed = window.confirm('Clear all modules? This cannot be undone.');
    if (!confirmed) return;

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
  const primaryRequiredPlan = useMemo(
    () => buildRequiredAverageForGpa(courses, 'primary', primaryTargetGPA),
    [courses, primaryTargetGPA]
  );
  const secondaryRequiredPlan = useMemo(
    () => buildRequiredAverageForGpa(courses, 'secondary', secondaryTargetGPA),
    [courses, secondaryTargetGPA]
  );

  const summaryRequiredPlan = doubleDegree
    ? (activeSummaryBucket === 'secondary' ? secondaryRequiredPlan : primaryRequiredPlan)
    : {
        requiredAverageGradePoint: Number(requiredAverage || 0),
        futureCredits: remainingCredits,
        possible: !isPlanImpossible,
        message: plan?.message || 'Add planned modules to calculate this.'
      };
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
  const gradePlanPermutations = useMemo(
    () => generateGradePlanPermutations(courses, gradePlanBucket, targetGPA),
    [courses, gradePlanBucket, targetGPA]
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo">
          <img src={`${process.env.PUBLIC_URL}/logo192.png`} alt="GPAce" className="logo-icon" />
          <h2>GPAce</h2>
        </div>
        <nav className="nav-menu">
          <a href="/dashboard" className="nav-item active">
            <span className="nav-icon">Dashboard</span>
          </a>
          <a href="/courses" className="nav-item">
            <span className="nav-icon">Course Planner</span>
          </a>
          <a href="/fgo" className="nav-item">
            <span className="nav-icon">FGO Planner</span>
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

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Academic Dashboard</h1>
            <p>Track completed modules, import transcripts, and plan the grades needed for your goal GPA.</p>
          </div>
        </header>

        {(message || error) && (
          <div className={error ? 'notice error' : 'notice success'}>
            {error || message}
          </div>
        )}

        {doubleDegree ? (
          <div className="stats-grid summary-grid double-degree-grid">
            {['primary', 'secondary'].map((bucket) => {
              const name = bucket === 'primary' ? degreeNames.primary : degreeNames.secondary;
              const current = Number(summary.buckets?.[bucket]?.gpa || 0);
              const credits = summary.buckets?.[bucket]?.creditsCompleted || 0;
              const target = bucket === 'primary' ? primaryTargetGPA : secondaryTargetGPA;
              const setTarget = bucket === 'primary' ? setPrimaryTargetGPA : setSecondaryTargetGPA;
              const requiredPlan = bucket === 'primary' ? primaryRequiredPlan : secondaryRequiredPlan;

              return (
                <React.Fragment key={bucket}>
                  <button
                    className={`stat-card stat-card-button ${selectedGpaBucket === bucket ? 'selected' : ''}`}
                    type="button"
                    onClick={() => setSelectedGpaBucket((current) => current === bucket ? '' : bucket)}
                  >
                    <div className="stat-header">
                      <span className="stat-label">{name} GPA</span>
                      <span className="stat-icon">Degree {bucket === 'primary' ? '1' : '2'}</span>
                    </div>
                    <div className="stat-value">{current.toFixed(2)}</div>
                    <div className="stat-subtitle">Based on {credits} total completed credits</div>
                  </button>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="stat-label">SET GOAL</span>
                      <span className="stat-icon">Target</span>
                    </div>
                    <div className="stat-value">{target.toFixed(2)}</div>
                    <div className="stat-subtitle">Desired cumulative GPA for {name}</div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.01"
                      value={target}
                      onChange={(event) => setTarget(parseFloat(event.target.value))}
                      className="gpa-slider"
                    />
                    <div className="slider-labels">
                      <span>0.0</span>
                      <span>5.0</span>
                    </div>
                  </div>

                  <div className={`stat-card ${!requiredPlan.possible ? 'alert' : ''}`}>
                    <div className="stat-header">
                      <span className="stat-label">{name} REQUIRED</span>
                      <span className="stat-icon">Degree {bucket === 'primary' ? '1' : '2'}</span>
                    </div>
                    <div className="stat-value">{(requiredPlan.requiredAverageGradePoint || 0).toFixed(2)}</div>
                    <div className={`stat-subtitle ${!requiredPlan.possible ? 'alert-text' : ''}`}>
                      {requiredPlan.message}
                    </div>
                    <div className="remaining-credits">
                      Remaining Credits: {requiredPlan.futureCredits}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="stats-grid summary-grid">
            <button
              className={`stat-card stat-card-button ${selectedGpaBucket === activeSummaryBucket ? 'selected' : ''}`}
              type="button"
              onClick={() => setSelectedGpaBucket((current) => current === activeSummaryBucket ? '' : activeSummaryBucket)}
            >
              <div className="stat-header">
                <span className="stat-label">CURRENT GPA</span>
                <span className="stat-icon">{isGuest ? 'Guest' : '5.0 scale'}</span>
              </div>
              <div className="stat-value">{currentSummaryGpa.toFixed(2)}</div>
              <div className="stat-subtitle">Based on {currentSummaryCredits} total completed credits</div>
            </button>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">SET GOAL</span>
                <span className="stat-icon">Target</span>
              </div>
              <div className="stat-value">{targetGPA.toFixed(2)}</div>
              <div className="stat-subtitle">Desired cumulative GPA</div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.01"
                value={targetGPA}
                onChange={(event) => setTargetGPA(parseFloat(event.target.value))}
                className="gpa-slider"
              />
              <div className="slider-labels">
                <span>0.0</span>
                <span>5.0</span>
              </div>
            </div>

            <div className={`stat-card ${!summaryRequiredPlan.possible ? 'alert' : ''}`}>
              <div className="stat-header">
                <span className="stat-label">REQUIRED AVERAGE</span>
                <span className="stat-icon">Future</span>
              </div>
              <div className="stat-value">{summaryRequiredPlan.requiredAverageGradePoint.toFixed(2)}</div>
              <div className={`stat-subtitle ${!summaryRequiredPlan.possible ? 'alert-text' : ''}`}>
                {summaryRequiredPlan.message}
              </div>
              <div className="remaining-credits">
                Remaining Credits: {summaryRequiredPlan.futureCredits}
              </div>
            </div>
          </div>
        )}

        {selectedGpaMeta && (
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
                      <td>{renderInlineTextInput(course, 'code', 'code-input')}</td>
                      <td>{renderInlineTextInput(course, 'name', 'name-input')}</td>
                      <td>{renderInlineTextInput(course, 'credits', 'credits-input')}</td>
                      <td>{renderBdeCheckbox(course)}</td>
                      <td>{renderInlineSelect(course, 'grade', gradeOptions, 'grade-select')}</td>
                      <td>{renderInlineSelect(course, 'status', statusOptions, `status-select ${String(course.status).toLowerCase().replace(/\s+/g, '-')}`)}</td>
                      {doubleDegree && (
                        <td>{renderInlineSelect(course, 'gpaBucket', gpaBucketOptions, 'gpa-bucket-select')}</td>
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
        )}

        <div className="dashboard-grid">
          <section className="courses-section">
            <div className="section-header">
              <h2>Modules & Courses</h2>
              <div className="section-actions">
                <button className="btn-secondary" type="button" onClick={loadDashboard} disabled={loading}>
                  {loading ? 'Refreshing...' : isGuest ? 'Reload Local' : 'Refresh'}
                </button>
                <button className="btn-danger" type="button" onClick={handleClearModules} disabled={loading || courses.length === 0}>
                  Clear All
                </button>
              </div>
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

            <div className="table-wrap">
              <table className="courses-table">
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
                <tbody>
                  {sortedCourses.map((course) => (
                    <tr key={course._id || `${course.code}-${course.academicYear}`}>
                      <td>{renderEditableTextCell(course, 'code', 'code-input')}</td>
                      <td>{renderEditableTextCell(course, 'name', 'name-input')}</td>
                      <td>{renderEditableTextCell(course, 'credits', 'credits-input')}</td>
                      <td>{renderBdeCheckbox(course)}</td>
                      <td>{renderEditableSelectCell(course, 'grade', gradeOptions, 'grade-select')}</td>
                      <td>{renderEditableSelectCell(course, 'status', statusOptions, `status-select ${String(course.status).toLowerCase().replace(/\s+/g, '-')}`)}</td>
                      {doubleDegree && (
                        <td>{renderEditableSelectCell(course, 'gpaBucket', gpaBucketOptions, 'gpa-bucket-select')}</td>
                      )}
                      <td>
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
                  ))}
                  {sortedCourses.length === 0 && (
                    <tr>
                      <td colSpan={doubleDegree ? '8' : '7'} className="empty-table">No modules yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="side-stack">
            <section className="side-panel">
              <h3>Import Transcript</h3>
              <form className="upload-box" onSubmit={handleTranscriptUpload}>
              <label className="file-picker">
                <input
                  type="file"
                  accept="application/pdf,text/plain,.pdf,.txt"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <span>{selectedFile ? selectedFile.name : 'Choose PDF transcript'}</span>
              </label>
              <button className="btn-primary" type="submit" disabled={uploading || isGuest}>
                {uploading ? 'Importing...' : isGuest ? 'Log in to Import' : 'Import Transcript'}
              </button>
              </form>
            </section>

            <section className="side-panel">
              <h3>Import Curriculum Structure</h3>
              <form className="upload-box" onSubmit={handleCurriculumUpload}>
                <label className="file-picker">
                  <input
                    type="file"
                    accept="application/pdf,text/plain,.pdf,.txt"
                    onChange={(event) => setSelectedCurriculumFile(event.target.files?.[0] || null)}
                  />
                  <span>{selectedCurriculumFile ? selectedCurriculumFile.name : 'Choose curriculum PDF'}</span>
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
                  <label className="file-picker">
                    <input
                      type="file"
                      accept="application/pdf,text/plain,.pdf,.txt"
                      onChange={(event) => setSelectedGpaMappingFile(event.target.files?.[0] || null)}
                    />
                    <span>{selectedGpaMappingFile ? selectedGpaMappingFile.name : 'Choose GPA mapping document'}</span>
                  </label>
                  <button className="btn-primary" type="submit" disabled={mappingBusy || isGuest}>
                    {mappingBusy ? 'Applying...' : 'Apply Mapping'}
                  </button>
                </form>
              </section>
            )}

            <section className="side-panel">
              <h3>Add Future Module</h3>
              <form className="module-form" onSubmit={handleAddModule}>
              <input className="form-input" placeholder="Code" value={newModule.code} onChange={(event) => setNewModule({ ...newModule, code: event.target.value })} />
              <input className="form-input" placeholder="Module name" value={newModule.name} onChange={(event) => setNewModule({ ...newModule, name: event.target.value })} />
              <input className="form-input" type="number" min="0.5" step="0.5" placeholder="Credits" value={newModule.credits} onChange={(event) => setNewModule({ ...newModule, credits: Number(event.target.value) })} />
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={newModule.isBde}
                  onChange={(event) => setNewModule({ ...newModule, isBde: event.target.checked })}
                />
                <span>BDE module</span>
              </label>
              {doubleDegree && (
                <select className="form-input" value={newModule.gpaBucket} onChange={(event) => setNewModule({ ...newModule, gpaBucket: event.target.value })}>
                  {gpaBucketOptions.map((bucket) => (
                    <option key={bucket} value={bucket}>{bucket}</option>
                  ))}
                </select>
              )}
                <select className="form-input" value={newModule.status} onChange={(event) => setNewModule({ ...newModule, status: event.target.value, grade: event.target.value === 'Completed' ? newModule.grade : '-' })}>
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              {newModule.status === 'Completed' && (
                <select className="form-input" value={newModule.grade} onChange={(event) => setNewModule({ ...newModule, grade: event.target.value })}>
                  {gradeOptions.filter((grade) => grade !== '-').map((grade) => (
                    <option key={grade}>{grade}</option>
                  ))}
                </select>
              )}
              <button className="btn-primary" type="submit" disabled={savingModule}>
                {savingModule ? 'Saving...' : 'Save Module'}
              </button>
              </form>
            </section>

            <section className="side-panel plan-panel">
              <h3>Grade Plan Permutations</h3>
              {doubleDegree && (
                <label className="plan-selector">
                  Generate for
                  <select value={gradePlanBucket} onChange={(event) => setGradePlanBucket(event.target.value)}>
                    <option value="overall">Overall GPA</option>
                    <option value="primary">{degreeNames.primary}</option>
                    <option value="secondary">{degreeNames.secondary}</option>
                  </select>
                </label>
              )}
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
              {!gradePlanPermutations.possible && plan?.message && (
                <p>{plan.message}</p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
