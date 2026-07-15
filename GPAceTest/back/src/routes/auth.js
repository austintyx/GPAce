const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// Credential-guessing is the main brute-force risk here, so /login gets a
// tighter cap than the rest of the auth router.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ message: "Too many login attempts. Try again in a few minutes." })
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ message: "Too many requests. Try again in a few minutes." })
});

router.post('/signup', authLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.patch('/profile', authController.updateProfile);
router.patch('/password', authLimiter, authController.changePassword);
router.post('/profile-picture', authLimiter, upload.single('avatar'), authController.uploadProfilePicture);
router.delete('/profile-picture', authLimiter, authController.removeProfilePicture);
router.delete('/account', authLimiter, authController.deleteAccount);

module.exports = router;
