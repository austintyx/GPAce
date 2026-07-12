const NAME_STOPWORDS = ['a', 'an', 'the', 'of', 'in', 'for', 'and', 'with', 'course', 'courses', 'degree', 'programme', 'program', 'bachelor', 'bachelors', 'honours', 'honors'];

function wordsFrom(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !NAME_STOPWORDS.includes(word));
}

// All significant words, including short ones (e.g. "AI", "IT") — used only
// for acronym building, where short words are exactly what matters.
function significantWords(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !NAME_STOPWORDS.includes(word));
}

function normaliseForCompare(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function acronymOf(value) {
  return significantWords(value).map((word) => word[0]).join('');
}

function degreeTokens(user, bucket) {
  const value = bucket === 'secondary'
    ? user.secondaryDegreeName
    : user.primaryDegreeName || user.course;
  return wordsFrom(value);
}

function scoreText(text, tokens) {
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function codePrefix(code) {
  const match = String(code || '').toUpperCase().match(/^[A-Z]+/);
  return match ? match[0] : '';
}

// Course codes almost never contain the literal words of a degree's name
// (e.g. "SC2002" vs. "Computer Science"), so text matching against the
// code/name alone rarely fires. Course code prefixes are a much stronger,
// university-agnostic signal (the same prefix — e.g. "SC" or "AB" — is
// reused across a whole school/programme's modules). This builds a
// prefix -> bucket map by majority vote from modules the user (or a
// previous classification pass) has already tagged with a real bucket.
function buildPrefixBucketMap(existingModules = []) {
  const prefixVotes = {};

  existingModules.forEach((module) => {
    const bucket = module.gpaBucket;
    if (!['primary', 'secondary', 'shared'].includes(bucket)) return;

    const prefix = codePrefix(module.code);
    if (!prefix) return;

    prefixVotes[prefix] = prefixVotes[prefix] || {};
    prefixVotes[prefix][bucket] = (prefixVotes[prefix][bucket] || 0) + 1;
  });

  const prefixBucket = {};
  Object.entries(prefixVotes).forEach(([prefix, votes]) => {
    const entries = Object.entries(votes);
    const totalVotes = entries.reduce((sum, [, count]) => sum + count, 0);
    const [topBucket, topCount] = entries.sort((a, b) => b[1] - a[1])[0];

    // Only trust a prefix if it has been consistently tagged one way —
    // a prefix that's genuinely shared between both degrees (e.g. common
    // core courses) should stay ambiguous rather than get force-assigned.
    if (topCount / totalVotes >= 0.8) prefixBucket[prefix] = topBucket;
  });

  return prefixBucket;
}

// Scores how well a transcript's official programme name (e.g. "COMPUTING
// (COMPUTER SCIENCE)") matches what the user typed as a degree name (e.g.
// "Computer Science", "Comp Sci", or even just "CS"). Combines three
// deliberately loose signals so *some* signal fires for almost any real
// phrasing difference:
//   1. Whole-phrase containment either direction.
//   2. Shared significant words (>= 3 letters) between the two strings.
//   3. Acronym match either direction (typed initials vs. full programme
//      name, or vice versa).
function scoreProgrammeMatch(programmeName, degreeName) {
  if (!programmeName || !degreeName) return 0;

  const normProgramme = normaliseForCompare(programmeName);
  const normDegree = normaliseForCompare(degreeName);
  if (!normProgramme || !normDegree) return 0;

  let score = 0;

  if (normProgramme.includes(normDegree) || normDegree.includes(normProgramme)) score += 3;

  score += Math.max(scoreText(programmeName, wordsFrom(degreeName)), scoreText(degreeName, wordsFrom(programmeName)));

  const programmeAcronym = acronymOf(programmeName);
  const degreeAcronym = acronymOf(degreeName);
  const normDegreeCompact = normDegree.replace(/\s+/g, '');
  const normProgrammeCompact = normProgramme.replace(/\s+/g, '');

  if (programmeAcronym.length >= 2 && programmeAcronym === normDegreeCompact) score += 4;
  if (degreeAcronym.length >= 2 && degreeAcronym === normProgrammeCompact) score += 4;

  return score;
}

// A double-degree transcript is normally two individual degree transcripts
// stapled together, each headed by its own "PROGRAMME : X" line (see
// transcriptParser.js). Resolves each distinct programme name found in a
// transcript to 'primary' or 'secondary' exactly once per import, so every
// module ends up bucketed even when the loose matching above can't find any
// textual overlap at all — ties (including "no signal either way") are
// broken by which programme was encountered first in the document, so this
// never falls back to 'unassigned'.
function resolveProgrammeBuckets(user, programmeNames = []) {
  const distinct = Array.from(new Set((programmeNames || []).filter(Boolean)));
  const map = {};
  if (distinct.length === 0) return map;

  const primaryDegreeName = user.primaryDegreeName || user.course || '';
  const secondaryDegreeName = user.secondaryDegreeName || '';

  if (distinct.length === 1) {
    const [name] = distinct;
    const primaryScore = scoreProgrammeMatch(name, primaryDegreeName);
    const secondaryScore = scoreProgrammeMatch(name, secondaryDegreeName);
    map[name] = secondaryScore > primaryScore ? 'secondary' : 'primary';
    return map;
  }

  const scored = distinct.map((name, index) => ({
    name,
    index,
    affinity: scoreProgrammeMatch(name, primaryDegreeName) - scoreProgrammeMatch(name, secondaryDegreeName)
  }));

  scored
    .sort((a, b) => (b.affinity - a.affinity) || (a.index - b.index))
    .forEach((entry, rank) => {
      map[entry.name] = rank === 0 ? 'primary' : 'secondary';
    });

  return map;
}

function bucketFromProgrammeMap(moduleData, programmeBucketMap) {
  if (!Array.isArray(moduleData.programmes) || moduleData.programmes.length === 0) return null;
  if (moduleData.programmes.length > 1) return 'shared';

  return programmeBucketMap[moduleData.programmes[0]] || null;
}

function inferGpaBucket(user, moduleData, existingModules = [], programmeBucketMap = {}) {
  if (!user.isDoubleDegree) return 'primary';

  const programmeBucket = bucketFromProgrammeMap(moduleData, programmeBucketMap);
  if (programmeBucket) return programmeBucket;

  const prefix = codePrefix(moduleData.code);
  const prefixBucket = buildPrefixBucketMap(existingModules);
  if (prefix && prefixBucket[prefix]) return prefixBucket[prefix];

  const text = `${moduleData.code || ''} ${moduleData.name || ''} ${moduleData.type || ''} ${moduleData.academicYear || ''}`;
  const primaryScore = scoreText(text, degreeTokens(user, 'primary'));
  const secondaryScore = scoreText(text, degreeTokens(user, 'secondary'));

  if (primaryScore > 0 && secondaryScore > 0 && primaryScore === secondaryScore) return 'shared';
  if (secondaryScore > primaryScore) return 'secondary';
  if (primaryScore > secondaryScore) return 'primary';
  return 'unassigned';
}

// Matches both real course codes (3-4 digit, e.g. "SC1003", "CC0001") and
// the generic placeholder codes curriculum/GPA-mapping documents print for
// elective slots (e.g. "SC3xxx", "SC4xxx", "BXxxxx") — see isCourseCode in
// curriculumParser.js, which these deliberately mirror.
function codeRegex() {
  return /\b[A-Z]{2,4}\d{3,4}[A-Z]?(?:-[A-Z0-9]+)?\b|\b[A-Z]{2}\d?x{3,4}\b/gi;
}

// "AY2021", "AY2023" etc. (academic-year cohort references, e.g. "(AY2021
// and later cohorts)") happen to have the same shape as a real course code
// and would otherwise be picked up by codeRegex as one.
function isLikelyYearReference(code) {
  return /^AY\d{4}$/i.test(code);
}

// A stored module's code for an elective placeholder slot isn't the plain
// "SC3xxx" text a document prints — it's uniquified per-slot (see
// makePlaceholderCode in curriculumParser.js), e.g. "SC3XXX-MPE-1-1" and
// "SC3XXX-MPE-1-2" for two different "SC3xxx" rows. Matching a document's
// mapping strictly against the full stored code would never find these at
// all. This checks the code as stored first, then falls back to its
// placeholder base (everything before the first "-"), so "SC3XXX-MPE-1-1"
// matches a document entry keyed just "SC3XXX".
function lookupDocumentBucket(code, documentMap) {
  const normalised = String(code || '').toUpperCase();
  if (documentMap[normalised]) return documentMap[normalised];

  const base = normalised.split('-')[0];
  if (base && base !== normalised && documentMap[base]) return documentMap[base];

  return null;
}

function buildDocumentMap(text, user) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // A GPA-mapping document for a double degree is typically two separate
  // course lists stapled together — one per degree (e.g. "List of Courses
  // for the CGPA Computation of BComp (Computer Science)..." followed later
  // by the equivalent BBus list). A course that genuinely counts toward
  // both degrees gets printed once in each list, so it's seen tagged with
  // *different* buckets at different points in the same document. Recording
  // every bucket a code was ever seen under (instead of overwriting on each
  // occurrence) and resolving conflicts to 'shared' catches that — a code
  // observed under a "primary" section in one place and a "secondary"
  // section in another can't correctly be either one alone, and which
  // section happens to come last in the document (and thus "wins" under a
  // simple overwrite) isn't a meaningful signal.
  const observedBuckets = {};
  let currentBucket = null;
  const primaryDegreeName = user.primaryDegreeName || user.course || '';
  const secondaryDegreeName = user.secondaryDegreeName || '';

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const isHeaderLike = !codeRegex().test(line) && line.length < 120;
    // scoreProgrammeMatch is the same deliberately loose matcher used to
    // resolve a transcript's PROGRAMME headers (substring containment +
    // shared words + acronym match either direction), so a degree name
    // typed as "Computer Science" still matches a document heading like
    // "BComp (Computer Science)" or "BEng (Computer Science) & B.Business
    // (BA Specialization) DOUBLE DEGREE PROGRAMME".
    const primaryScore = scoreProgrammeMatch(line, primaryDegreeName);
    const secondaryScore = scoreProgrammeMatch(line, secondaryDegreeName);
    // A genuine section-header match (e.g. "BComp (Computer Science) AU
    // Load") scores several points, from whole-phrase containment and/or
    // multiple shared words. A single coincidental word overlap — e.g. the
    // word "bus" inside an unrelated sentence ("...courses from BUS
    // programme...") happening to be a substring of "Business Analytics" —
    // only ever scores 1. Requiring a minimum score before trusting a line
    // as a real section switch stops those weak one-off matches from
    // silently overriding the section a code actually appears under.
    const MIN_SECTION_SCORE = 2;
    const hasConfidentScore = Math.max(primaryScore, secondaryScore) >= MIN_SECTION_SCORE;

    if (isHeaderLike || lower.includes('gpa') || lower.includes('degree')) {
      if (lower.includes('common') || lower.includes('shared')) currentBucket = 'shared';
      else if (lower.includes('excluded') || lower.includes('not counted')) currentBucket = 'excluded';
      else if (hasConfidentScore && secondaryScore > primaryScore) currentBucket = 'secondary';
      else if (hasConfidentScore && primaryScore > secondaryScore) currentBucket = 'primary';
    }

    // Footnotes explaining that one degree's requirement is *fulfilled by* a
    // course from the other degree (e.g. "- AB3602 Strategic Management
    // (3AU)" under a note about what satisfies the CS-side internship
    // requirement) are substitution/equivalency notes, not a second real
    // appearance of that course in this degree's own GPA table. These
    // documents consistently print such notes as a bulleted list under the
    // referencing requirement, so a leading bullet marker is a reliable
    // signal to not treat the line as a genuine table row — otherwise a
    // course that's only really counted toward one degree (with the other
    // degree merely referencing it as a substitute) gets wrongly merged into
    // 'shared' just because its code shows up on both halves of the
    // document.
    const isFootnoteBullet = /^[-•*]\s/.test(line);

    const codes = isFootnoteBullet
      ? []
      : (line.match(codeRegex()) || []).filter((code) => !isLikelyYearReference(code));
    codes.forEach((code) => {
      const bucket = currentBucket
        || (hasConfidentScore ? (secondaryScore > primaryScore ? 'secondary' : primaryScore > secondaryScore ? 'primary' : null) : null);
      if (!bucket) return;

      const key = code.toUpperCase();
      if (!observedBuckets[key]) observedBuckets[key] = new Set();
      observedBuckets[key].add(bucket);
    });
  });

  const mapping = {};
  Object.entries(observedBuckets).forEach(([code, buckets]) => {
    if (buckets.has('excluded')) mapping[code] = 'excluded';
    else if (buckets.has('shared') || buckets.size > 1) mapping[code] = 'shared';
    else mapping[code] = [...buckets][0];
  });

  return mapping;
}

function classifyFromDocument(user, moduleData, documentMap, existingModules = [], programmeBucketMap = {}) {
  return lookupDocumentBucket(moduleData.code, documentMap) || inferGpaBucket(user, moduleData, existingModules, programmeBucketMap);
}

module.exports = {
  buildDocumentMap,
  classifyFromDocument,
  inferGpaBucket,
  resolveProgrammeBuckets,
  lookupDocumentBucket
};
