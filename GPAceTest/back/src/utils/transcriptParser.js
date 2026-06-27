const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D+', 'D', 'F', 'P', 'U', 'PASS', 'EX'];
const GRADE_PATTERN = '(A\\+|A-|A|B\\+|B-|B|C\\+|C|D\\+|D|F|PASS|EX|P|U)';
const CODE_PATTERN = '[A-Z]{2,4}\\d{3,4}[A-Z]?';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isCourseCode(value) {
  return new RegExp(`^${CODE_PATTERN}$`, 'i').test(clean(value));
}

function isCredit(value) {
  return /^\d+(?:\.\d+)?$/.test(clean(value));
}

function isGrade(value) {
  return VALID_GRADES.includes(clean(value).toUpperCase());
}

function parseDelimitedLine(line) {
  const parts = line.split(/,|\t/).map(clean).filter(Boolean);
  if (parts.length < 4) return null;

  const grade = parts.find((part) => isGrade(part));
  const credits = parts.find((part) => isCredit(part));
  const code = parts.find((part) => isCourseCode(part));

  if (!grade || !credits) return null;

  const name = parts
    .filter((part) => part !== grade && part !== credits && part !== code)
    .join(' ');

  return {
    code: code || `MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: name || 'Untitled module',
    credits: Number(credits),
    grade: grade.toUpperCase(),
    status: 'Completed'
  };
}

function parseFreeTextLine(line) {
  const regex = new RegExp(`^(${CODE_PATTERN})\\s+(.+?)\\s+(?:AU|CU|Credits?|Credit Units?)?\\s*(\\d+(?:\\.\\d+)?)\\s+(?:Grade\\s*)?${GRADE_PATTERN}$`, 'i');
  const match = clean(line).match(regex);
  if (!match) return null;

  return {
    code: match[1].toUpperCase(),
    name: clean(match[2]),
    credits: Number(match[3]),
    grade: match[4].toUpperCase(),
    status: 'Completed'
  };
}

function parseGradeBeforeCreditsLine(line) {
  const regex = new RegExp(`^(${CODE_PATTERN})\\s+(.+?)\\s+(?:Grade\\s*)?${GRADE_PATTERN}\\s+(?:AU|CU|Credits?|Credit Units?)?\\s*(\\d+(?:\\.\\d+)?)$`, 'i');
  const match = clean(line).match(regex);
  if (!match) return null;

  return {
    code: match[1].toUpperCase(),
    name: clean(match[2]),
    credits: Number(match[4]),
    grade: match[3].toUpperCase(),
    status: 'Completed'
  };
}

function parseFlattenedText(text) {
  const flattened = clean(text);
  const patterns = [
    new RegExp(`(${CODE_PATTERN})\\s+(.{2,120}?)\\s+(?:AU|CU|Credits?|Credit Units?)?\\s*(\\d+(?:\\.\\d+)?)\\s+(?:Grade\\s*)?${GRADE_PATTERN}(?=\\s+${CODE_PATTERN}|\\s*$)`, 'gi'),
    new RegExp(`(${CODE_PATTERN})\\s+(.{2,120}?)\\s+(?:Grade\\s*)?${GRADE_PATTERN}\\s+(?:AU|CU|Credits?|Credit Units?)?\\s*(\\d+(?:\\.\\d+)?)(?=\\s+${CODE_PATTERN}|\\s*$)`, 'gi')
  ];

  const modules = [];

  patterns.forEach((pattern, index) => {
    for (const match of flattened.matchAll(pattern)) {
      modules.push({
        code: match[1].toUpperCase(),
        name: clean(match[2]),
        credits: Number(index === 0 ? match[3] : match[4]),
        grade: (index === 0 ? match[4] : match[3]).toUpperCase(),
        status: 'Completed'
      });
    }
  });

  return modules;
}

function shouldContinueCourseName(currentName, nextLine, remainingLines, remainingNames) {
  if (!currentName) return true;
  if (remainingLines <= remainingNames) return false;

  const current = clean(currentName);
  const next = clean(nextLine);
  const continuationEndings = /(&| AND| IN| FOR| OF| TO| THE| AN| A| WITH|:|,|\()$/i;
  const continuationStarts = /^&|^(AND|FOR|OF|IN|WORLD|DESIGN|PROGRAMMING|THINKING|INTERDISCIPLINARY|STRATEGIES|TECHNIQUES|HUMANITY|ARCHITECTURE|ENVIRONMENT|COMPUTING|ANALYSIS|PREDICTIVE|FUTURE|MANAGEMENT|SOCIETY|ECONOMY|WELLBEING)\b/i;

  return continuationEndings.test(current) || continuationStarts.test(next);
}

function splitCourseNames(nameLines, expectedCount) {
  const names = [];
  let current = '';

  nameLines.forEach((line, index) => {
    const remainingLines = nameLines.length - index - 1;
    const remainingNames = expectedCount - names.length - 1;
    const nextLine = nameLines[index + 1] || '';

    current = current ? `${current} ${line}` : line;

    if (names.length < expectedCount - 1 && !shouldContinueCourseName(current, nextLine, remainingLines, remainingNames)) {
      names.push(clean(current));
      current = '';
    }
  });

  if (current) names.push(clean(current));

  while (names.length < expectedCount) {
    names.push('Untitled module');
  }

  if (names.length > expectedCount) {
    const extra = names.splice(expectedCount - 1);
    names.push(extra.join(' '));
  }

  return names;
}

function getSemesterLabels(lines, codeStartIndex) {
  const semesterPattern = /^\d{4}-\d{4}(?: SEMESTER \d| SPECIAL TERM)$/i;
  return lines
    .slice(Math.max(0, codeStartIndex - 80), codeStartIndex)
    .filter((line) => semesterPattern.test(line))
    .slice(-12);
}

function getEarnedUnits(lines, startIndex) {
  const earnedUnits = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].startsWith('Cumulative Grade Point Average') || lines[index].startsWith('TOTAL ACADEMIC UNITS EARNED')) {
      break;
    }

    const match = lines[index].match(/No\. of Academic Units Earned\s*:\s*(\d+(?:\.\d+)?)/i);
    if (match) earnedUnits.push(Number(match[1]));
  }

  return earnedUnits;
}

function assignAcademicYears(credits, semesterLabels, earnedUnits) {
  const labels = [];
  let semesterIndex = 0;
  let semesterCreditTotal = 0;

  credits.forEach((credit) => {
    labels.push(semesterLabels[semesterIndex] || 'Unknown');

    if (earnedUnits.length > 0) {
      semesterCreditTotal += Number(credit || 0);
      if (semesterCreditTotal >= earnedUnits[semesterIndex] - 0.001) {
        semesterIndex += 1;
        semesterCreditTotal = 0;
      }
    } else if (semesterLabels.length > 0) {
      const approximateSize = Math.ceil(credits.length / semesterLabels.length);
      if (labels.length % approximateSize === 0) semesterIndex += 1;
    }
  });

  return labels;
}

function parseNtuColumnBlocks(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isCourseCode(lines[index])) continue;

    const codes = [];
    let cursor = index;
    while (cursor < lines.length && isCourseCode(lines[cursor])) {
      codes.push(lines[cursor].toUpperCase());
      cursor += 1;
    }

    if (codes.length < 3) continue;

    const semesterLabels = getSemesterLabels(lines, index);

    const credits = [];
    while (cursor < lines.length && isCredit(lines[cursor]) && credits.length < codes.length) {
      credits.push(Number(lines[cursor]));
      cursor += 1;
    }

    if (credits.length !== codes.length) continue;

    const grades = [];
    while (cursor < lines.length && isGrade(lines[cursor]) && grades.length < codes.length) {
      grades.push(lines[cursor].toUpperCase());
      cursor += 1;
    }

    if (grades.length !== codes.length) continue;

    const nameLines = [];
    while (
      cursor < lines.length &&
      !lines[cursor].startsWith('No. of Academic Units Earned') &&
      !isCourseCode(lines[cursor]) &&
      !(lines[cursor] === '*' || isCredit(lines[cursor]))
    ) {
      nameLines.push(lines[cursor]);
      cursor += 1;
    }

    const names = splitCourseNames(nameLines, codes.length);
    const earnedUnits = getEarnedUnits(lines, cursor);
    const academicYears = assignAcademicYears(credits, semesterLabels, earnedUnits);

    const blockModules = codes.map((code, moduleIndex) => ({
        code,
        name: names[moduleIndex] || code,
        credits: credits[moduleIndex],
        grade: grades[moduleIndex],
        academicYear: academicYears[moduleIndex] || 'Unknown',
        status: 'Completed'
      }));

    blocks.push(blockModules);

    index = cursor;
  }

  if (blocks.length === 0) return [];

  return blocks.reduce((largest, block) => block.length > largest.length ? block : largest, []);
}

function dedupeModules(modules) {
  const byCode = new Map();

  modules.forEach((module) => {
    if (new RegExp(CODE_PATTERN, 'i').test(module.name)) return false;

    const key = `${module.code}-${module.academicYear || ''}`;
    const existing = byCode.get(key);
    if (!existing || module.name.length > existing.name.length || (existing.name === 'Untitled module' && module.name !== 'Untitled module')) {
      byCode.set(key, module);
    }
  });

  return Array.from(byCode.values());
}

function parseTranscriptText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const modules = [];
  const ignoredLines = [];

  lines.forEach((line) => {
    const parsed = parseDelimitedLine(line) || parseFreeTextLine(line) || parseGradeBeforeCreditsLine(line);

    if (parsed && Number.isFinite(parsed.credits) && parsed.credits > 0) {
      modules.push(parsed);
    } else {
      ignoredLines.push(line);
    }
  });

  const flattenedModules = parseFlattenedText(text);
  const ntuModules = parseNtuColumnBlocks(text);
  const detectedModules = dedupeModules([...ntuModules, ...modules, ...flattenedModules])
    .filter((module) => Number.isFinite(module.credits) && module.credits > 0);

  return {
    modules: detectedModules,
    ignoredLines,
    detectedCount: detectedModules.length
  };
}

module.exports = { parseTranscriptText };
