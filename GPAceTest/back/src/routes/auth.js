const express = require('express');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/authController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.patch('/profile', authController.updateProfile);
router.patch('/password', authController.changePassword);
router.post('/profile-picture', upload.single('avatar'), authController.uploadProfilePicture);
router.delete('/profile-picture', authController.removeProfilePicture);
router.delete('/account', authController.deleteAccount);

module.exports = router;
