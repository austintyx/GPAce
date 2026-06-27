function wordsFrom(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !['degree', 'with', 'and', 'course', 'programme', 'program'].includes(word));
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

function inferGpaBucket(user, moduleData) {
  if (!user.isDoubleDegree) return 'primary';

  const text = `${moduleData.code || ''} ${moduleData.name || ''} ${moduleData.type || ''} ${moduleData.academicYear || ''}`;
  const primaryScore = scoreText(text, degreeTokens(user, 'primary'));
  const secondaryScore = scoreText(text, degreeTokens(user, 'secondary'));

  if (primaryScore > 0 && secondaryScore > 0 && primaryScore === secondaryScore) return 'shared';
  if (secondaryScore > primaryScore) return 'secondary';
  if (primaryScore > secondaryScore) return 'primary';
  return 'unassigned';
}

function codeRegex() {
  return /\b[A-Z]{2,4}\d{4}[A-Z]?(?:-[A-Z0-9]+)?\b/g;
}

function buildDocumentMap(text, user) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const mapping = {};
  let currentBucket = null;
  const primaryTokens = degreeTokens(user, 'primary');
  const secondaryTokens = degreeTokens(user, 'secondary');

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const isHeaderLike = !codeRegex().test(line) && line.length < 120;
    const primaryScore = scoreText(lower, primaryTokens);
    const secondaryScore = scoreText(lower, secondaryTokens);

    if (isHeaderLike || lower.includes('gpa') || lower.includes('degree')) {
      if (lower.includes('common') || lower.includes('shared')) currentBucket = 'shared';
      else if (lower.includes('excluded') || lower.includes('not counted')) currentBucket = 'excluded';
      else if (secondaryScore > primaryScore) currentBucket = 'secondary';
      else if (primaryScore > secondaryScore) currentBucket = 'primary';
    }

    const codes = line.match(codeRegex()) || [];
    codes.forEach((code) => {
      if (currentBucket) {
        mapping[code.toUpperCase()] = currentBucket;
        return;
      }

      if (secondaryScore > primaryScore) mapping[code.toUpperCase()] = 'secondary';
      else if (primaryScore > secondaryScore) mapping[code.toUpperCase()] = 'primary';
    });
  });

  return mapping;
}

function classifyFromDocument(user, moduleData, documentMap) {
  const code = String(moduleData.code || '').toUpperCase();
  return documentMap[code] || inferGpaBucket(user, moduleData);
}

module.exports = {
  buildDocumentMap,
  classifyFromDocument,
  inferGpaBucket
};
