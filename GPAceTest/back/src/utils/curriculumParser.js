// Curriculum structure documents vary quite a bit between degrees/schools:
// some list "Course Code / Course Title / Type / AU / Pre-requisite" (5
// columns, title included), others list "Course Code / Type / AU /
// Pre-requisite" (4 columns, no title at all, relying on the reader already
// knowing the course names). Some use "Remarks" instead of "Pre-requisite"
// for reference tables (e.g. an "MPE Structure" appendix). The header match
// and row parser below are written to accept either shape rather than one
// hardcoded format, and course titles are read directly from the document
// when present instead of relying solely on the fallback lookup table below.
const TITLE_BY_CODE = {
  AB0602: 'Communication Management Strategies',
  AB1003: 'Professional Attachment',
  AB1201: 'Financial Management',
  AB1202: 'Statistics & Analysis',
  AB1301: 'Business Law',
  AB1501: 'Marketing',
  AB1601: 'Organisational Behaviour and Design',
  AB2008: 'Careers Future Forward',
  AB3602: 'Strategic Management',
  AD1102: 'Financial Accounting',
  AD2102: 'Management Accounting',
  BC2402: 'Designing & Developing Databases',
  BC2406: 'Analytics I: Visual & Predictive Analytics',
  BC2407: 'Analytics II: Advanced Predictive Analytics',
  CC0001: 'Inquiry & Communication in an Interdisciplinary World',
  CC0002: 'Navigating the Digital World',
  CC0003: 'Ethics & Civics in a Multicultural World',
  CC0005: 'Healthy Living & Wellbeing',
  CC0006: 'Sustainability: Society, Economy & Environment',
  CC0007: 'Science & Technology for Humanity',
  EG1001: 'Engineers in Society',
  HE5091: 'Principles of Economics',
  MH1810: 'Mathematics I',
  MH1812: 'Discrete Mathematics',
  ML0004: 'Career & Innovative Enterprise for the Future World',
  SC1003: 'Introduction to Computational Thinking & Programming',
  SC1004: 'Linear Algebra for Computing',
  SC1005: 'Digital Logic',
  SC1006: 'Computer Organisation & Architecture',
  SC1007: 'Data Structures & Algorithms',
  SC1013: 'Physics for Computing',
  SC1015: 'Introduction to Data Science & Artificial Intelligence',
  SC2000: 'Probability & Statistics for Computing',
  SC2001: 'Algorithm Design & Analysis',
  SC2002: 'Object Oriented Design & Programming',
  SC2005: 'Operating Systems',
  SC2006: 'Software Engineering',
  SC2008: 'Computer Network',
  SC2079: 'Multidisciplinary Design Project',
  SC3000: 'Artificial Intelligence',
  SC3010: 'Computing Security',
  SC4079: 'Final Year Project'
};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isCourseCode(value) {
  return /^[A-Z]{2,4}\d{3,4}[A-Z]?$/i.test(value) || /^[A-Z]{2}\d?x{3,4}$/i.test(value);
}

function makePlaceholderCode(code, type, index) {
  if (!/x/i.test(code)) return code.toUpperCase();

  const label = clean(type || 'ELEC').replace(/[^A-Z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase();
  return `${code.toUpperCase()}-${label}-${index}`;
}

// Prefers the title as printed in the document itself (works for any
// degree's course list), falling back to the small known-course lookup
// table, then to a generic label for placeholder/elective slots, and
// finally to the bare code if nothing else is available.
function makeName(code, capturedTitle, type) {
  const title = clean(capturedTitle);
  if (title) return title;
  if (TITLE_BY_CODE[code]) return TITLE_BY_CODE[code];
  if (/x/i.test(code)) return `${clean(type || 'Elective')} Elective`;
  return code;
}

function normaliseModuleCategory(type) {
  const value = clean(type).toUpperCase();
  if (value.includes('BDE')) return 'BDE';
  if (value.includes('ICC') || value.includes('CC')) return 'ICC';
  if (value.includes('MPE') || value.includes('MAJOR PRESCRIBED')) return 'MPE';
  if (value.includes('CORE') || value.includes('GER') || value.includes('MH') || value.includes('SC') || value.includes('AB') || value.includes('AD')) return 'Core';
  return 'Uncategorised';
}

// Matches a real semester/term header line, e.g. "YEAR 1 SEMESTER 1",
// "YEAR 1 SPECIAL SEMESTER", "YEAR 2 SPECIAL TERM". Used both to label each
// block of courses with the semester actually printed in the document
// (rather than assuming a fixed 9-slot sequence every curriculum follows),
// and to recognise where a genuine semester's course table starts so that
// reference/appendix tables further down the document (an "MPE Structure"
// list, a supplementary course listing, etc.) aren't mistaken for one.
const SEMESTER_HEADER_PATTERN = /^YEAR\s+\d+\s+(?:SEMESTER\s+\d+|SPECIAL\s+SEMESTER|SPECIAL\s+TERM)$/i;

// Accepts the table header with or without a "Course Title" column, and
// with either "Pre-requisite" or "Remarks" as the last column label.
const TABLE_HEADER_PATTERN = /^Course\s*Code(?:\s+Course\s*Title)?\s+Type\s+AU\s+(?:Pre-?requisite|Remarks)$/i;

// What a "Type" value actually looks like across these documents: a short
// known bare word (Core, Elective, ...), or a hyphenated code (C-Core,
// F-Core, MPE-1, BC-PE1, ...), or letters directly followed by digits
// (MPE1). Deliberately NOT "any non-space token" — titles can end in a bare
// number themselves (e.g. "BA/CS Integration 1"), and without this
// constraint that trailing number gets mistaken for the AU column, cutting
// the title short and shifting every field after it by one token.
const TYPE_TOKEN = '(?:core|elective|compulsory|common|prescribed|ger|gee|icc|bde|mpe|pe|[A-Za-z]+-[A-Za-z0-9]+|[A-Za-z]+\\d+)';

// Row shape when the document includes a course title column:
//   CODE  TITLE (free text)  TYPE  AU (number)  PREREQ (rest of line)
const ROW_WITH_TITLE_PATTERN = new RegExp(
  `^([A-Z]{2,4}\\d{3,4}[A-Z]?|[A-Z]{2}\\d?x{3,4})\\s+(.+?)\\s+(${TYPE_TOKEN})\\s+(\\d+(?:\\.\\d+)?)\\s+(.+)$`,
  'i'
);

// Row shape when there's no title column at all:
//   CODE  TYPE  AU (number)  PREREQ (rest of line)
const ROW_WITHOUT_TITLE_PATTERN = new RegExp(
  `^([A-Z]{2,4}\\d{3,4}[A-Z]?|[A-Z]{2}\\d?x{3,4})\\s+(${TYPE_TOKEN})\\s+(\\d+(?:\\.\\d+)?)\\s+(.+)$`,
  'i'
);

function parseRow(line) {
  const withTitle = line.match(ROW_WITH_TITLE_PATTERN);
  if (withTitle && isCourseCode(withTitle[1])) {
    return {
      rawCode: withTitle[1],
      title: clean(withTitle[2]),
      type: clean(withTitle[3]),
      credits: Number(withTitle[4]),
      prerequisite: clean(withTitle[5])
    };
  }

  const withoutTitle = line.match(ROW_WITHOUT_TITLE_PATTERN);
  if (withoutTitle && isCourseCode(withoutTitle[1])) {
    return {
      rawCode: withoutTitle[1],
      title: '',
      type: clean(withoutTitle[2]),
      credits: Number(withoutTitle[3]),
      prerequisite: clean(withoutTitle[4])
    };
  }

  return null;
}

function parseCurriculumText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const blocks = [];
  let currentSemesterLabel = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (SEMESTER_HEADER_PATTERN.test(line)) {
      currentSemesterLabel = line.toUpperCase();
      continue;
    }

    if (!TABLE_HEADER_PATTERN.test(line)) continue;

    // Reference/appendix tables (an MPE structure list, a supplementary
    // course listing, etc.) reuse this exact same header row further down
    // the document but aren't part of the actual semester-by-semester
    // schedule — skip any table header that isn't preceded by a real
    // semester header rather than guessing it into a semester slot.
    if (!currentSemesterLabel) continue;

    const rows = [];
    let cursor = index + 1;

    while (cursor < lines.length) {
      const candidate = lines[cursor];
      if (TABLE_HEADER_PATTERN.test(candidate) || SEMESTER_HEADER_PATTERN.test(candidate)) break;
      if (/^\d+(?:\.\d+)?$/.test(candidate)) {
        cursor += 1;
        break;
      }

      const parsed = parseRow(candidate);
      if (parsed) rows.push(parsed);

      cursor += 1;
    }

    if (rows.length > 0) blocks.push({ academicYear: currentSemesterLabel, rows });

    currentSemesterLabel = null; // require an explicit header again before the next block counts
    index = cursor - 1;
  }

  const placeholderCounts = {};

  const modules = blocks.flatMap(({ academicYear, rows }) =>
    rows.map((row) => {
      const rawCode = row.rawCode.toUpperCase();
      placeholderCounts[rawCode] = (placeholderCounts[rawCode] || 0) + 1;
      const code = makePlaceholderCode(rawCode, row.type, placeholderCounts[rawCode]);

      return {
        code,
        name: makeName(rawCode, row.title, row.type),
        credits: row.credits,
        grade: '-',
        status: 'Planned',
        academicYear,
        type: row.type,
        moduleCategory: normaliseModuleCategory(row.type),
        isBde: normaliseModuleCategory(row.type) === 'BDE',
        prerequisite: row.prerequisite
      };
    })
  );

  return {
    modules,
    detectedCount: modules.length
  };
}

module.exports = { parseCurriculumText, normaliseModuleCategory };
