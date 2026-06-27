const Module = require('../models/modules');
const User = require('../models/user');
const { PDFParse } = require('pdf-parse');
const { calculateGpa, calculateGpaByBucket, buildGradePlan } = require('../utils/gpa');
const { parseTranscriptText } = require('../utils/transcriptParser');
const { parseCurriculumText } = require('../utils/curriculumParser');
const { buildDocumentMap, classifyFromDocument, inferGpaBucket } = require('../utils/gpaBucketClassifier');

function getUserId(req) {
  const bearer = req.headers.authorization || '';
  const tokenUserId = bearer.match(/^Bearer\s+token-([a-f\d]{24})-/i);
  return req.body.userId || req.query.userId || req.headers['x-user-id'] || (tokenUserId && tokenUserId[1]);
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
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

async function readUploadedText(req, fileLabel) {
  if (!req.file) throw new Error(`Upload a PDF or text ${fileLabel} file.`);

  const originalName = req.file.originalname || '';
  const isPdf = req.file.mimetype === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf');
  const isText = req.file.mimetype === 'text/plain' || originalName.toLowerCase().endsWith('.txt');

  if (isPdf) return extractPdfText(req.file.buffer);
  if (isText) return req.file.buffer.toString('utf8');

  throw new Error(`Only PDF and plain text ${fileLabel} files are supported right now.`);
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

    const savedModules = [];
    for (const moduleData of parsed.modules) {
      const academicYear = moduleData.academicYear || req.body.academicYear || user.academicYear || 'Unknown';
      const gpaBucket = moduleData.gpaBucket || inferGpaBucket(user, moduleData);
      const saved = await Module.findOneAndUpdate(
        { user: user._id, code: moduleData.code, academicYear },
        { ...moduleData, user: user._id, academicYear, gpaBucket },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
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

    const transcriptText = await readUploadedText(req, 'transcript');

    const parsed = parseTranscriptText(transcriptText);

    if (parsed.modules.length === 0) {
      return res.status(400).json({
        message: 'The file was read, but no modules could be detected.',
        extractedTextPreview: transcriptText.slice(0, 1000),
        ...parsed
      });
    }

    const savedModules = [];
    for (const moduleData of parsed.modules) {
      const academicYear = moduleData.academicYear || user.academicYear || 'Unknown';
      const gpaBucket = moduleData.gpaBucket || inferGpaBucket(user, moduleData);
      const saved = await Module.findOneAndUpdate(
        { user: user._id, code: moduleData.code, academicYear },
        { ...moduleData, user: user._id, academicYear, gpaBucket },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
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
        { ...moduleData, user: user._id, gpaBucket: moduleData.gpaBucket || inferGpaBucket(user, moduleData) },
        { new: true, upsert: true, runValidators: true }
      );
      savedModules.push(saved);
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
    res.json({ modules, summary: buildAcademicSummary(user, modules), user });
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
      gpaBucket
    } = req.body;

    if (!code || !name || !credits) {
      return res.status(400).json({ message: 'code, name and credits are required.' });
    }

    const module = await Module.findOneAndUpdate(
      { user: user._id, code: code.toUpperCase(), academicYear },
      { user: user._id, academicYear, code: code.toUpperCase(), name, credits, grade, status, gpaBucket: gpaBucket || inferGpaBucket(user, { code, name, academicYear }) },
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
      gpaBucket
    } = req.body;

    if (!code || !name || !credits) {
      return res.status(400).json({ message: 'code, name and credits are required.' });
    }

    const module = await Module.findOneAndUpdate(
      { _id: req.params.moduleId, user: user._id },
      { academicYear, code: code.toUpperCase(), name, credits, grade, status, gpaBucket: gpaBucket || inferGpaBucket(user, { code, name, academicYear }) },
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
    const updatedModules = [];

    for (const module of modules) {
      const gpaBucket = inferGpaBucket(user, module);
      const updated = await Module.findOneAndUpdate(
        { _id: module._id, user: user._id },
        { gpaBucket },
        { new: true, runValidators: true }
      );
      updatedModules.push(updated);
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
    const updatedModules = [];

    for (const module of modules) {
      const gpaBucket = classifyFromDocument(user, module, documentMap);
      const updated = await Module.findOneAndUpdate(
        { _id: module._id, user: user._id },
        { gpaBucket },
        { new: true, runValidators: true }
      );
      updatedModules.push(updated);
    }

    res.json({
      modules: updatedModules,
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
