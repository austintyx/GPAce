const GRADE_POINTS = {
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

const GPA_GRADES = Object.keys(GRADE_POINTS).sort((a, b) => GRADE_POINTS[b] - GRADE_POINTS[a]);

function normaliseGrade(grade) {
  return String(grade || '').trim().toUpperCase();
}

function getGradePoint(grade) {
  const value = GRADE_POINTS[normaliseGrade(grade)];
  return typeof value === 'number' ? value : null;
}

function calculateGpa(modules) {
  const countedModules = modules
    .map((module) => ({
      ...module,
      credits: Number(module.credits),
      gradePoint: getGradePoint(module.grade)
    }))
    .filter((module) => {
      const status = module.status || 'Completed';
      return status === 'Completed' && Number.isFinite(module.credits) && module.credits > 0 && module.gradePoint !== null;
    });

  const creditsAttempted = countedModules.reduce((sum, module) => sum + module.credits, 0);
  const qualityPoints = countedModules.reduce((sum, module) => sum + module.credits * module.gradePoint, 0);

  return {
    gpa: creditsAttempted > 0 ? Number((qualityPoints / creditsAttempted).toFixed(2)) : 0,
    creditsAttempted,
    creditsCompleted: modules
      .filter((module) => module.status === 'Completed')
      .reduce((sum, module) => sum + Number(module.credits || 0), 0),
    qualityPoints: Number(qualityPoints.toFixed(2)),
    countedModules
  };
}

function calculateGpaByBucket(modules) {
  const primaryModules = modules.filter((module) => ['primary', 'shared', undefined, null, ''].includes(module.gpaBucket));
  const secondaryModules = modules.filter((module) => ['secondary', 'shared'].includes(module.gpaBucket));

  return {
    overall: calculateGpa(modules.filter((module) => module.gpaBucket !== 'excluded')),
    primary: calculateGpa(primaryModules),
    secondary: calculateGpa(secondaryModules),
    unassignedCount: modules.filter((module) => module.gpaBucket === 'unassigned').length
  };
}

function gradeForAverage(requiredAverage) {
  if (requiredAverage > 5) return null;
  return GPA_GRADES.slice().reverse().find((grade) => GRADE_POINTS[grade] >= requiredAverage) || 'F';
}

function buildGradePlan({ completedModules, plannedModules, desiredGpa }) {
  const current = calculateGpa(completedModules);
  const futureCredits = plannedModules.reduce((sum, module) => sum + Number(module.credits || 0), 0);
  const target = Number(desiredGpa);

  if (!Number.isFinite(target) || target < 0 || target > 5) {
    throw new Error('desiredGpa must be a number between 0 and 5.');
  }

  if (futureCredits <= 0) {
    return {
      current,
      desiredGpa: target,
      futureCredits,
      possible: current.gpa >= target,
      requiredAverageGradePoint: 0,
      minimumUniformGrade: null,
      recommendations: []
    };
  }

  const totalCreditsAtGraduation = current.creditsAttempted + futureCredits;
  const requiredFutureQualityPoints = target * totalCreditsAtGraduation - current.qualityPoints;
  const requiredAverageGradePoint = requiredFutureQualityPoints / futureCredits;
  const minimumUniformGrade = gradeForAverage(requiredAverageGradePoint);
  const possible = requiredAverageGradePoint <= 5;

  const recommendations = plannedModules.map((module) => ({
    code: module.code,
    name: module.name,
    credits: Number(module.credits),
    suggestedMinimumGrade: minimumUniformGrade,
    suggestedGradePoint: minimumUniformGrade ? GRADE_POINTS[minimumUniformGrade] : null
  }));

  return {
    current,
    desiredGpa: target,
    futureCredits,
    possible,
    requiredAverageGradePoint: Number(requiredAverageGradePoint.toFixed(2)),
    minimumUniformGrade,
    recommendations,
    message: possible
      ? `You need to average about ${requiredAverageGradePoint.toFixed(2)} grade points across future credits.`
      : 'The target GPA is not reachable with the listed future credits, even with all A/A+ grades.'
  };
}

module.exports = {
  GRADE_POINTS,
  calculateGpa,
  calculateGpaByBucket,
  buildGradePlan,
  getGradePoint
};
