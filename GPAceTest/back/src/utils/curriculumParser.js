const SEMESTER_LABELS = [
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

function makeName(code, type) {
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

function parseCurriculumText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== 'Course Code Type AU Pre-requisite') continue;

    const rows = [];
    let cursor = index + 1;

    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === 'Course Code Type AU Pre-requisite') break;
      if (/^\d+(?:\.\d+)?$/.test(line)) {
        cursor += 1;
        break;
      }

      const match = line.match(/^([A-Z]{2,4}\d{3,4}[A-Z]?|[A-Z]{2}\d?x{3,4})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(.+)$/i);
      if (match && isCourseCode(match[1])) {
        rows.push({
          rawCode: match[1],
          type: clean(match[2]),
          credits: Number(match[3]),
          prerequisite: clean(match[4])
        });
      }

      cursor += 1;
    }

    if (rows.length > 0) blocks.push(rows);
    index = cursor - 1;
  }

  const scheduledBlocks = blocks.slice(0, SEMESTER_LABELS.length);
  const placeholderCounts = {};

  const modules = scheduledBlocks.flatMap((block, blockIndex) => {
    const academicYear = SEMESTER_LABELS[blockIndex] || `CURRICULUM BLOCK ${blockIndex + 1}`;

    return block.map((row) => {
      const rawCode = row.rawCode.toUpperCase();
      placeholderCounts[rawCode] = (placeholderCounts[rawCode] || 0) + 1;
      const code = makePlaceholderCode(rawCode, row.type, placeholderCounts[rawCode]);

      return {
        code,
        name: makeName(rawCode, row.type),
        credits: row.credits,
        grade: '-',
        status: 'Planned',
        academicYear,
        type: row.type,
        moduleCategory: normaliseModuleCategory(row.type),
        isBde: normaliseModuleCategory(row.type) === 'BDE',
        prerequisite: row.prerequisite
      };
    });
  });

  return {
    modules,
    detectedCount: modules.length
  };
}

module.exports = { parseCurriculumText, normaliseModuleCategory };
