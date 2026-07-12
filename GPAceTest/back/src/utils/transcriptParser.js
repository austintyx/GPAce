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

// Each block produced by parseNtuColumnBlocks is already one contiguous run
// of course codes bounded by non-code text (credits/grades/names/earned-units
// lines) before the next semester's codes start, so it corresponds to exactly
// one semester. The previous implementation collected every semester header
// found in an 80-line lookback window and then always started labelling from
// the first one, so every block after the first got mislabelled with an
// earlier semester's name (or worse, silently collided in the database with
// another module that happened to share a code, since academicYear+code+user
// must be unique). Finding the single nearest preceding header fixes both.
function findNearestSemesterLabel(lines, codeStartIndex) {
  const semesterPattern = /^\d{4}-\d{4}(?: SEMESTER \d| SPECIAL TERM)$/i;

  for (let index = codeStartIndex - 1; index >= 0; index -= 1) {
    if (semesterPattern.test(lines[index])) return lines[index];
  }

  return 'Unknown';
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

    const semesterLabel = findNearestSemesterLabel(lines, index);

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

    const blockModules = codes.map((code, moduleIndex) => ({
        code,
        name: names[moduleIndex] || code,
        credits: credits[moduleIndex],
        grade: grades[moduleIndex],
        academicYear: semesterLabel,
        status: 'Completed'
      }));

    blocks.push(blockModules);

    index = cursor;
  }

  // Each block corresponds to one semester's column of codes/credits/grades.
  // A transcript normally has one block per semester, so every block needs
  // to be kept and merged — previously this only kept the single largest
  // block and silently dropped every other semester's modules.
  return blocks.flat();
}

const PROGRAMME_PATTERN = /^PROGRAMME\s*:\s*(.+)$/i;
const SEMESTER_HEADER_PATTERN = /^\d{4}-\d{4}\s+(?:SEMESTER\s+\d|SPECIAL\s+TERM)$/i;
const MODULE_ROW_PATTERN = new RegExp(
  `^(?:\\*\\s*)?(${CODE_PATTERN})\\s+(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s+${GRADE_PATTERN}(?:\\s+\\d+(?:\\.\\d+)?)?$`,
  'i'
);
const NOISE_LINE_PATTERN = new RegExp(
  [
    'No\\.\\s*of\\s*Academic\\s*Units\\s*Earned',
    'Cumulative\\s*Grade\\s*Point\\s*Average',
    'TOTAL\\s*ACADEMIC\\s*UNITS\\s*EARNED',
    '^Grade$',
    '^Point$',
    '^Code\\s*Course\\s*AU\\s*Grade',
    'END OF RESULTS',
    '^NANYANG',
    '^UNIVERSITY$',
    '^EXAMINATION RESULTS$',
    '^RESULTS$',
    '^NAME OF STUDENT',
    '^MATRIC NO',
    '^DATE OF BIRTH',
    '^Print date',
    '^This is a computer generated',
    '^A COMPLETE TRANSCRIPT',
    '^and no signature',
    '^Page \\d+ of \\d+$',
    '^GRADINGS?$',
    '^Letter-Grade$',
    '^SYSTEM$',
    '^NOTATIONS?$'
  ].join('|'),
  'i'
);

// Official transcripts (e.g. NTU's) print each module as one row of
// "CODE NAME CREDITS GRADE [GRADE POINT]" once the PDF has been extracted in
// correct column order (see pdfTextExtractor.js). This is the row format
// text produced by that column-aware extractor actually uses, so it's tried
// first; the older heuristics below remain as a fallback for plain pasted
// text that doesn't come from that extractor.
//
// On a double-degree transcript, shared/common modules are printed once on
// *each* individual degree's transcript section (both under the same
// "PROGRAMME : X" header pattern), so a module can legitimately be seen
// under more than one programme. Those get merged into one record tagged
// with every programme it appeared under — `programmes.length > 1` is a
// reliable, deterministic "this counts toward both degrees" signal, used by
// gpaBucketClassifier instead of guessing from the course code/name alone.
function parseColumnAwareTranscript(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const modules = [];
  const programmes = [];
  let currentProgramme = null;
  let currentSemester = 'Unknown';
  let lastModule = null;

  lines.forEach((line) => {
    const programmeMatch = line.match(PROGRAMME_PATTERN);
    if (programmeMatch) {
      currentProgramme = clean(programmeMatch[1]);
      if (!programmes.includes(currentProgramme)) programmes.push(currentProgramme);
      lastModule = null;
      return;
    }

    if (SEMESTER_HEADER_PATTERN.test(line)) {
      currentSemester = line.toUpperCase();
      lastModule = null;
      return;
    }

    const moduleMatch = line.match(MODULE_ROW_PATTERN);
    if (moduleMatch) {
      const module = {
        code: moduleMatch[1].toUpperCase(),
        name: clean(moduleMatch[2]),
        credits: Number(moduleMatch[3]),
        grade: moduleMatch[4].toUpperCase(),
        academicYear: currentSemester,
        status: 'Completed',
        programmes: currentProgramme ? [currentProgramme] : []
      };
      modules.push(module);
      lastModule = module;
      return;
    }

    if (NOISE_LINE_PATTERN.test(line)) {
      lastModule = null;
      return;
    }

    // Anything else is a wrapped continuation of the previous module's name
    // (e.g. "ORGANISATIONAL BEHAVIOUR &" on one row, "DESIGN" on the next).
    if (lastModule && !isCourseCode(line)) {
      lastModule.name = clean(`${lastModule.name} ${line}`);
    }
  });

  const merged = new Map();
  modules.forEach((module) => {
    const key = `${module.code}-${module.academicYear}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...module, programmes: [...module.programmes] });
      return;
    }

    module.programmes.forEach((programme) => {
      if (!existing.programmes.includes(programme)) existing.programmes.push(programme);
    });
    if (module.name.length > existing.name.length) existing.name = module.name;
  });

  return { modules: Array.from(merged.values()), programmes };
}

// Transcripts print calendar academic years (e.g. "2025-2026 SEMESTER 1"),
// but the course planner and curriculum imports organise everything by
// year-of-study instead ("YEAR 1 SEMESTER 1", "YEAR 2 SEMESTER 1", ...) —
// see defaultSemesters in CoursePlannerPage.jsx and SEMESTER_HEADER_PATTERN
// in curriculumParser.js. Left as calendar years, every transcript import
// would create its own brand-new set of semester columns instead of landing
// in the student's existing "YEAR 1"/"YEAR 2" columns. This detects which
// calendar year is chronologically first *in this transcript* and remaps it
// (and every subsequent one) to a relative year number, so a transcript
// starting in 2025-2026 always becomes YEAR 1 regardless of what the actual
// calendar year is.
const CALENDAR_SEMESTER_PATTERN = /^(\d{4})-(\d{4})\s+(SEMESTER\s+(\d)|SPECIAL\s+TERM)$/i;

function normaliseAcademicYears(modules) {
  const calendarYears = [];

  modules.forEach((module) => {
    const match = String(module.academicYear || '').match(CALENDAR_SEMESTER_PATTERN);
    if (!match) return;

    const startYear = Number(match[1]);
    if (!calendarYears.includes(startYear)) calendarYears.push(startYear);
  });

  if (calendarYears.length === 0) return modules;

  calendarYears.sort((a, b) => a - b);
  const yearRank = new Map(calendarYears.map((year, index) => [year, index + 1]));

  return modules.map((module) => {
    const match = String(module.academicYear || '').match(CALENDAR_SEMESTER_PATTERN);
    if (!match) return module;

    const yearNumber = yearRank.get(Number(match[1]));
    // "SPECIAL TERM" (transcript wording) -> "SPECIAL SEMESTER" (the wording
    // CoursePlannerPage's defaultSemesters and curriculumParser.js already
    // use), so it lands in the same column rather than a near-duplicate one.
    const suffix = match[4] ? `SEMESTER ${match[4]}` : 'SPECIAL SEMESTER';

    return { ...module, academicYear: `YEAR ${yearNumber} ${suffix}` };
  });
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
  const { modules: columnAwareModules, programmes } = parseColumnAwareTranscript(text);

  // parseColumnAwareTranscript is built specifically for the row format that
  // pdfTextExtractor.js produces ("CODE NAME CREDITS GRADE [GRADE POINT]",
  // with PROGRAMME:/semester headers tracked as state) and is far more
  // reliable than the line-by-line regex guesses below, including carrying
  // the `programmes` tag double-degree bucket classification depends on. Its
  // results always win; the older strategies only fill in modules it didn't
  // find at all (e.g. text pasted in directly rather than extracted from a
  // matching PDF layout). Excluding by code alone (not code+academicYear) is
  // deliberate: the older strategies parse this row format incorrectly (the
  // trailing grade-point column throws off their credits/name columns), so
  // once the column-aware parser has found a code, any fallback detection of
  // that same code — even under a different, wrongly-detected semester — is
  // corrupted data that should be discarded rather than kept as a "different"
  // module.
  const columnAwareCodes = new Set(columnAwareModules.map((module) => module.code));
  const fallbackModules = [...ntuModules, ...modules, ...flattenedModules]
    .filter((module) => !columnAwareCodes.has(module.code));

  const detectedModules = normaliseAcademicYears(
    dedupeModules([...columnAwareModules, ...fallbackModules])
      .filter((module) => Number.isFinite(module.credits) && module.credits > 0)
  );

  return {
    modules: detectedModules,
    ignoredLines,
    detectedCount: detectedModules.length,
    programmes
  };
}

module.exports = { parseTranscriptText };
