const Module = require('../models/modules');
const User = require('../models/user');
const { calculateGpa, calculateGpaByBucket, buildGradePlan } = require('../utils/gpa');
const { parseTranscriptText } = require('../utils/transcriptParser');
const { parseCurriculumText, normaliseModuleCategory } = require('../utils/curriculumParser');
const { buildDocumentMap, inferGpaBucket, resolveGpaBucket, resolveProgrammeBuckets, lookupDocumentBucket } = require('../utils/gpaBucketClassifier');
const { extractPdfText, extractTranscriptPdfText } = require('../utils/pdfTextExtractor');

function getUserId(req) {
  const bearer = req.headers.authorization || '';
  const tokenUserId = bearer.match(/^Bearer\s+token-([a-f\d]{24})-/i);
  return req.body.userId || req.query.userId || req.headers['x-user-id'] || (tokenUserId && tokenUserId[1]);
}

async function resolveUser(req, res) {
  const userId = getUserId(req);

  if (!userId) {
    res.status(401).json({ message: 'Provide a userId or a Bearer auth token.' });
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return null;
  }

  return user;
}

function buildAcademicSummary(user, modules) {
  if (!user.isDoubleDegree) return calculateGpa(modules);

  return {
    ...calculateGpa(modules.filter((module) => module.gpaBucket !== 'excluded')),
    doubleDegree: true,
    degreeNames: {
      primary: user.primaryDegreeName || user.course || 'Degree 1',
      secondary: user.secondaryDegreeName || 'Degree 2'
    },
    buckets: calculateGpaByBucket(modules)
  };
}

async function readUploadedText(req, fileLabel, { columnAware = false } = {}) {
  if (!req.file) throw new Error(`Upload a PDF or text ${fileLabel} file.`);

  const originalName = req.file.originalname || '';
  const isPdf = req.file.mimetype === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf');
  const isText = req.file.mimetype === 'text/plain' || originalName.toLowerCase().endsWith('.txt');

  if (isPdf) return columnAware ? extractTranscriptPdfText(req.file.buffer) : extractPdfText(req.file.buffer);
  if (isText) return req.file.buffer.toString('utf8');

  throw new Error(`Only PDF and plain text ${fileLabel} files are supported right now.`);
}

function resolveModuleCategory(moduleData = {}) {
  return moduleData.moduleCategory || normaliseModuleCategory(moduleData.type || '');
}

function resolveIsBde(moduleData = {}) {
  if (typeof moduleData.isBde === 'boolean') return moduleData.isBde;
  return resolveModuleCategory(moduleData) === 'BDE';
}

exports.parseTranscript = async (req, res) => {
  const transcriptText = req.body.transcriptText || req.body.text || '';
  if (!transcriptText.trim()) {
    return res.status(400).json({ message: 'transcriptText is required.' });
  }

  res.json(parseTranscriptText(transcriptText));
};

exports.importTranscript = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = parseTranscriptText(req.body.transcriptText || req.body.text || '');

    if (parsed.modules.length === 0) {
      return res.status(400).json({ message: 'No modules could be detected from the transcript text.', ...parsed });
    }

    const existingModules = await Module.find({ user: user._id });
    const programmeBucketMap = resolveProgrammeBuckets(user, parsed.programmes);
    const savedModules = [];
    for (const moduleData of parsed.modules) {
      const academicYear = moduleData.academicYear || req.body.academicYear || user.academicYear || 'Unknown';
      const gpaBucket = resolveGpaBucket(user, moduleData, existingModules, programmeBucketMap);
      const moduleCategory = resolveModuleCategory(moduleData);
      const isBde = resolveIsBde(moduleData);
      const saved = await Module.findOneAndUpdate(
        { user: user._id, code: moduleData.code, academicYear },
        { ...moduleData, user: user._id, academicYear, gpaBucket, moduleCategory, isBde },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
      existingModules.push(saved);
    }

    res.status(201).json({
      modules: savedModules,
      ignoredLines: parsed.ignoredLines,
      summary: buildAcademicSummary(user, savedModules)
    });
  } catch (err) {
    console.error('Transcript import error:', err);
    res.status(500).json({ message: 'Transcript import failed.' });
  }
};

exports.uploadTranscript = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ message: 'Upload a PDF or text transcript file.' });
    }

    const transcriptText = await readUploadedText(req, 'transcript', { columnAware: true });

    const parsed = parseTranscriptText(transcriptText);

    if (parsed.modules.length === 0) {
      return res.status(400).json({
        message: 'The file was read, but no modules could be detected.',
        extractedTextPreview: transcriptText.slice(0, 1000),
        ...parsed
      });
    }

    const existingModules = await Module.find({ user: user._id });
    const programmeBucketMap = resolveProgrammeBuckets(user, parsed.programmes);
    const savedModules = [];
    for (const moduleData of parsed.modules) {
      const academicYear = moduleData.academicYear || user.academicYear || 'Unknown';
      const gpaBucket = resolveGpaBucket(user, moduleData, existingModules, programmeBucketMap);
      const moduleCategory = resolveModuleCategory(moduleData);
      const isBde = resolveIsBde(moduleData);
      const saved = await Module.findOneAndUpdate(
        { user: user._id, code: moduleData.code, academicYear },
        { ...moduleData, user: user._id, academicYear, gpaBucket, moduleCategory, isBde },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
      existingModules.push(saved);
    }

    const allModules = await Module.find({ user: user._id }).sort({ academicYear: 1, code: 1 });

    res.status(201).json({
      modules: allModules,
      importedModules: savedModules,
      ignoredLines: parsed.ignoredLines,
      detectedCount: parsed.detectedCount,
      summary: buildAcademicSummary(user, allModules),
      extractedTextPreview: transcriptText.slice(0, 1000)
    });
  } catch (err) {
    console.error('Transcript upload error:', err);
    res.status(500).json({ message: err.message || 'Transcript upload failed.' });
  }
};

exports.uploadCurriculum = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const curriculumText = await readUploadedText(req, 'curriculum');

    const parsed = parseCurriculumText(curriculumText);

    if (parsed.modules.length === 0) {
      return res.status(400).json({
        message: 'The file was read, but no curriculum modules could be detected.',
        extractedTextPreview: curriculumText.slice(0, 1000),
        ...parsed
      });
    }

    const existingModules = await Module.find({ user: user._id });
    const existingCodes = new Set(existingModules.map((module) => module.code.toUpperCase()));
    const importedKeys = new Set();
    const savedModules = [];
    const skippedModules = [];

    for (const moduleData of parsed.modules) {
      const code = moduleData.code.toUpperCase();
      const importKey = `${code}-${moduleData.academicYear}`;

      if (existingCodes.has(code) || importedKeys.has(importKey)) {
        skippedModules.push(moduleData);
        continue;
      }

      const saved = await Module.findOneAndUpdate(
        { user: user._id, code: moduleData.code, academicYear: moduleData.academicYear },
        {
          ...moduleData,
          user: user._id,
          gpaBucket: resolveGpaBucket(user, moduleData, existingModules),
          moduleCategory: resolveModuleCategory(moduleData),
          isBde: resolveIsBde(moduleData)
        },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
      existingModules.push(saved);
      importedKeys.add(importKey);
    }

    const allModules = await Module.find({ user: user._id }).sort({ academicYear: 1, code: 1 });

    res.status(201).json({
      modules: allModules,
      importedModules: savedModules,
      skippedModules,
      detectedCount: parsed.detectedCount,
      summary: buildAcademicSummary(user, allModules),
      extractedTextPreview: curriculumText.slice(0, 1000)
    });
  } catch (err) {
    console.error('Curriculum upload error:', err);
    res.status(500).json({ message: err.message || 'Curriculum upload failed.' });
  }
};

exports.listModules = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const modules = await Module.find({ user: user._id }).sort({ academicYear: 1, code: 1 });
    const normalizedModules = user.isDoubleDegree
      ? modules
      : modules.map((module) => ({ ...module.toObject(), gpaBucket: 'primary' }));
    res.json({ modules: normalizedModules, summary: buildAcademicSummary(user, modules), user });
  } catch (err) {
    res.status(500).json({ message: 'Unable to fetch modules.' });
  }
};

exports.upsertModule = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const {
      academicYear = user.academicYear || 'Unknown',
      code,
      name,
      credits,
      grade = '-',
      status = 'Planned',
      gpaBucket,
      moduleCategory,
      isBde = false
    } = req.body;

    if (!code || !name || !credits) {
      return res.status(400).json({ message: 'code, name and credits are required.' });
    }

    const existingModules = await Module.find({ user: user._id });

    const module = await Module.findOneAndUpdate(
      { user: user._id, code: code.toUpperCase(), academicYear },
      {
        user: user._id,
        academicYear,
        code: code.toUpperCase(),
        name,
        credits,
        grade,
        status,
        moduleCategory: moduleCategory || (isBde ? 'BDE' : 'Core'),
        isBde,
        gpaBucket: resolveGpaBucket(user, { gpaBucket, code, name, academicYear }, existingModules)
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ module });
  } catch (err) {
    console.error('Module save error:', err);
    res.status(500).json({ message: 'Unable to save module.' });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const {
      academicYear = user.academicYear || 'Unknown',
      code,
      name,
      credits,
      grade = '-',
      status = 'Planned',
      gpaBucket,
      moduleCategory,
      isBde
    } = req.body;

    if (!code || !name || !credits) {
      return res.status(400).json({ message: 'code, name and credits are required.' });
    }

    const existingModules = await Module.find({ user: user._id, _id: { $ne: req.params.moduleId } });

    const module = await Module.findOneAndUpdate(
      { _id: req.params.moduleId, user: user._id },
      {
        academicYear,
        code: code.toUpperCase(),
        name,
        credits,
        grade,
        status,
        ...(moduleCategory ? { moduleCategory } : {}),
        ...(typeof isBde === 'boolean' ? { isBde } : {}),
        ...(typeof isBde === 'boolean' && !moduleCategory ? { moduleCategory: isBde ? 'BDE' : 'Core' } : {}),
        gpaBucket: resolveGpaBucket(user, { gpaBucket, code, name, academicYear }, existingModules)
      },
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    res.json({ module });
  } catch (err) {
    console.error('Module update error:', err);
    res.status(500).json({ message: err.message || 'Unable to update module.' });
  }
};

exports.updateModuleBde = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { isBde } = req.body;
    if (typeof isBde !== 'boolean') {
      return res.status(400).json({ message: 'isBde must be true or false.' });
    }

    const module = await Module.findOneAndUpdate(
      { _id: req.params.moduleId, user: user._id },
      { isBde, moduleCategory: isBde ? 'BDE' : 'Core' },
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    res.json({ module });
  } catch (err) {
    console.error('Module BDE update error:', err);
    res.status(500).json({ message: err.message || 'Unable to update BDE setting.' });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const module = await Module.findOneAndDelete({ _id: req.params.moduleId, user: user._id });

    if (!module) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    res.json({ message: 'Module removed.', module });
  } catch (err) {
    console.error('Module delete error:', err);
    res.status(500).json({ message: 'Unable to remove module.' });
  }
};

exports.clearModules = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const result = await Module.deleteMany({ user: user._id });
    res.json({ message: 'All modules removed.', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Modules clear error:', err);
    res.status(500).json({ message: 'Unable to clear modules.' });
  }
};

exports.getGpa = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const modules = await Module.find({ user: user._id, status: 'Completed' });
    res.json(buildAcademicSummary(user, modules));
  } catch (err) {
    res.status(500).json({ message: 'Unable to calculate GPA.' });
  }
};

exports.predictGpaBuckets = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const modules = await Module.find({ user: user._id });
    // Any module the user has already manually assigned to primary/secondary/
    // shared acts as training data for the prefix-based classifier, so a
    // handful of manual corrections lets the rest of the same-prefix modules
    // get predicted correctly too.
    const referenceModules = [...modules];
    const updatedModules = [];

    for (const module of modules) {
      const gpaBucket = inferGpaBucket(user, module, referenceModules);
      const updated = await Module.findOneAndUpdate(
        { _id: module._id, user: user._id },
        { gpaBucket },
        { new: true, runValidators: true }
      );
      updatedModules.push(updated);
      referenceModules.push(updated);
    }

    res.json({
      modules: updatedModules,
      summary: buildAcademicSummary(user, updatedModules),
      message: `Predicted GPA category for ${updatedModules.length} module(s).`
    });
  } catch (err) {
    console.error('GPA bucket prediction error:', err);
    res.status(500).json({ message: err.message || 'Unable to predict GPA categories.' });
  }
};

exports.uploadGpaMapping = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const mappingText = await readUploadedText(req, 'GPA mapping');
    const documentMap = buildDocumentMap(mappingText, user);
    const modules = await Module.find({ user: user._id });

    // A GPA mapping document supplements/corrects the bucket for the course
    // codes it explicitly lists — it isn't a full re-classification pass, and
    // it only ever touches modules that are still 'Planned'. Completed (and
    // in-progress) modules already have a bucket that was either set
    // deliberately or resolved from the transcript's own PROGRAMME headers,
    // which is more reliable than a guess from a separately uploaded mapping
    // document, so those are left completely untouched (no DB write at all)
    // no matter what the document says. Use "Predict GPA Categories" for
    // guessing buckets on modules the document doesn't mention.
    const updatedModules = [];
    const matchedModules = [];

    for (const module of modules) {
      const mappedBucket = lookupDocumentBucket(module.code, documentMap);

      if (!mappedBucket || module.status !== 'Planned') {
        updatedModules.push(module);
        continue;
      }

      const updated = await Module.findOneAndUpdate(
        { _id: module._id, user: user._id },
        { gpaBucket: mappedBucket },
        { new: true, runValidators: true }
      );
      matchedModules.push(updated);
      updatedModules.push(updated);
    }

    res.json({
      modules: updatedModules,
      matchedModules,
      summary: buildAcademicSummary(user, updatedModules),
      detectedCodes: Object.keys(documentMap).length,
      extractedTextPreview: mappingText.slice(0, 1000)
    });
  } catch (err) {
    console.error('GPA mapping upload error:', err);
    res.status(500).json({ message: err.message || 'Unable to apply GPA mapping document.' });
  }
};

exports.planGrades = async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const completedModules = await Module.find({ user: user._id, status: 'Completed' });
    const plannedModules = req.body.plannedModules || await Module.find({ user: user._id, status: { $in: ['Planned', 'In Progress'] } });

    const plan = buildGradePlan({
      completedModules,
      plannedModules,
      desiredGpa: req.body.desiredGpa
    });

    res.json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Unable to build grade plan.' });
  }
};
