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

const creditScale = 2;

export const fgoSchemes = {
  '21au': { label: '21 AU', coreCap: 12, bdeCap: 9 },
  '24au': { label: '24 AU', coreCap: 12, bdeCap: 12 }
};

export function moduleKey(module) {
  return module._id || `${module.code}-${module.academicYear}`;
}

function gradePointFor(module) {
  return gradePoints[String(module.grade || '').toUpperCase()];
}

export function isCompletedGraded(module) {
  return module.status === 'Completed' && gradePointFor(module) !== undefined && Number(module.credits || 0) > 0;
}

export function sumCredits(modules) {
  return modules.reduce((sum, module) => sum + Number(module.credits || 0), 0);
}

export function isBdeModule(module) {
  return Boolean(module.isBde || module.moduleCategory === 'BDE');
}

function moduleMatchesGpaBucket(gpaBucket, bucket) {
  const normalizedBucket = gpaBucket || 'primary';
  if (bucket === 'primary') return ['primary', 'shared'].includes(normalizedBucket);
  if (bucket === 'secondary') return ['secondary', 'shared'].includes(normalizedBucket);
  return false;
}

export function getFilteredModulesForDegree(modules, selectedDegree, isDoubleDegree) {
  if (!isDoubleDegree) return modules;
  return modules.filter((module) => moduleMatchesGpaBucket(module.gpaBucket, selectedDegree));
}

function buildBestRemovalStates(candidates, capAu) {
  const cap = Math.round(capAu * creditScale);
  const states = Array.from({ length: cap + 1 }, () => null);
  states[0] = { removedQualityPoints: 0, modules: [] };

  candidates.forEach((module) => {
    const credits = Number(module.credits || 0);
    const creditUnits = Math.round(credits * creditScale);
    const qualityPoints = credits * gradePointFor(module);

    for (let used = cap - creditUnits; used >= 0; used -= 1) {
      const state = states[used];
      if (!state) continue;

      const nextUsed = used + creditUnits;
      const nextState = {
        removedQualityPoints: state.removedQualityPoints + qualityPoints,
        modules: [...state.modules, module]
      };

      if (!states[nextUsed] || nextState.removedQualityPoints < states[nextUsed].removedQualityPoints) {
        states[nextUsed] = nextState;
      }
    }
  });

  return states
    .map((state, creditUnits) => state && ({
      ...state,
      removedCredits: creditUnits / creditScale
    }))
    .filter(Boolean);
}

export function optimiseFgo(modules, isDoubleDegree, selectedDegree, coreCap, bdeCap) {
  const visibleModules = getFilteredModulesForDegree(modules, selectedDegree, isDoubleDegree);
  const gradedModules = visibleModules.filter(isCompletedGraded);
  const totalCredits = sumCredits(gradedModules);
  const totalQualityPoints = gradedModules.reduce((sum, module) => (
    sum + Number(module.credits || 0) * gradePointFor(module)
  ), 0);
  const currentGpa = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;

  const coreCandidates = gradedModules.filter((module) => !isBdeModule(module));
  const bdeCandidates = gradedModules.filter(isBdeModule);
  const coreStates = buildBestRemovalStates(coreCandidates, coreCap);
  const bdeStates = buildBestRemovalStates(bdeCandidates, bdeCap);

  let best = {
    selectedModules: [],
    projectedGpa: currentGpa,
    improvement: 0,
    coreCredits: 0,
    bdeCredits: 0
  };

  coreStates.forEach((coreState) => {
    bdeStates.forEach((bdeState) => {
      const removedCredits = coreState.removedCredits + bdeState.removedCredits;
      if (removedCredits <= 0 || totalCredits - removedCredits <= 0) return;

      const removedQualityPoints = coreState.removedQualityPoints + bdeState.removedQualityPoints;
      const projectedGpa = (totalQualityPoints - removedQualityPoints) / (totalCredits - removedCredits);
      const improvement = projectedGpa - currentGpa;

      if (improvement > best.improvement + 0.0001) {
        best = {
          selectedModules: [...coreState.modules, ...bdeState.modules].sort((a, b) => (
            String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
          )),
          projectedGpa,
          improvement,
          coreCredits: coreState.removedCredits,
          bdeCredits: bdeState.removedCredits
        };
      }
    });
  });

  return {
    currentGpa: Number(currentGpa.toFixed(2)),
    projectedGpa: Number(best.projectedGpa.toFixed(2)),
    improvement: Number(best.improvement.toFixed(2)),
    selectedModules: best.selectedModules,
    coreCredits: best.coreCredits,
    bdeCredits: best.bdeCredits,
    eligibleCount: coreCandidates.length + bdeCandidates.length,
    totalCredits
  };
}
