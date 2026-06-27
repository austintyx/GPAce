const express = require('express');
const multer = require('multer');
const academicController = require('../controllers/academicController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

router.post('/transcript/parse', academicController.parseTranscript);
router.post('/transcript/import', academicController.importTranscript);
router.post('/transcript/upload', upload.single('transcript'), academicController.uploadTranscript);
router.post('/curriculum/upload', upload.single('curriculum'), academicController.uploadCurriculum);
router.post('/gpa-buckets/predict', academicController.predictGpaBuckets);
router.post('/gpa-buckets/upload', upload.single('mapping'), academicController.uploadGpaMapping);
router.get('/modules', academicController.listModules);
router.post('/modules', academicController.upsertModule);
router.delete('/modules', academicController.clearModules);
router.put('/modules/:moduleId', academicController.updateModule);
router.delete('/modules/:moduleId', academicController.deleteModule);
router.get('/gpa', academicController.getGpa);
router.post('/plan', academicController.planGrades);

module.exports = router;
