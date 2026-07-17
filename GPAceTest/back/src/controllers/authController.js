const bcrypt = require('bcrypt');
const User = require('../models/user');
const Module = require('../models/modules');
const mongoose = require('mongoose');
const { isPasswordStrong, PASSWORD_REQUIREMENTS_MESSAGE } = require('../utils/passwordPolicy');

function sanitizeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        course: user.course,
        isDoubleDegree: Boolean(user.isDoubleDegree),
        primaryDegreeName: user.primaryDegreeName || user.course || '',
        secondaryDegreeName: user.secondaryDegreeName || '',
        profilePicture: user.profilePicture || ''
    };
}

function getUserId(req) {
    const bearer = req.headers.authorization || '';
    const tokenUserId = bearer.match(/^Bearer\s+token-([a-f\d]{24})-/i);
    return req.body.userId || req.query.userId || req.headers['x-user-id'] || (tokenUserId && tokenUserId[1]);
}

exports.signup = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Database is not connected. Make sure MongoDB is running." });
        }

        const { name, course, email, password, isDoubleDegree, primaryDegreeName, secondaryDegreeName } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required." });
        }

        if (!isPasswordStrong(password)) {
            return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered." });
        }

        // Hash password and create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name.trim(),
            course: course ? course.trim() : "",
            isDoubleDegree: Boolean(isDoubleDegree),
            primaryDegreeName: primaryDegreeName ? primaryDegreeName.trim() : (course ? course.trim() : ""),
            secondaryDegreeName: secondaryDegreeName ? secondaryDegreeName.trim() : "",
            email: normalizedEmail,
            password: hashedPassword
        });
        await user.save();

        // Generate token
        const token = `token-${user._id}-${Math.random().toString(36).slice(2, 10)}`;

        res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: err.message || "Signup failed." });
    }
};

exports.login = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Database is not connected. Make sure MongoDB is running." });
        }

        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = `token-${user._id}-${Math.random().toString(36).slice(2, 10)}`;
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ message: "Login failed." });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Provide a Bearer auth token." });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const { name, course, isDoubleDegree, primaryDegreeName, secondaryDegreeName } = req.body;
        if (name) user.name = name.trim();
        if (course !== undefined) user.course = course.trim();
        user.isDoubleDegree = Boolean(isDoubleDegree);
        user.primaryDegreeName = primaryDegreeName ? primaryDegreeName.trim() : user.course;
        user.secondaryDegreeName = Boolean(isDoubleDegree) && secondaryDegreeName ? secondaryDegreeName.trim() : "";
        await user.save();

        res.json({ user: sanitizeUser(user) });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ message: err.message || "Unable to update profile." });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Provide a Bearer auth token." });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new password are required." });
        }
        if (!isPasswordStrong(newPassword)) {
            return res.status(400).json({ message: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password updated." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: err.message || "Unable to change password." });
    }
};

const ALLOWED_PICTURE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

exports.uploadProfilePicture = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Provide a Bearer auth token." });

        if (!req.file) {
            return res.status(400).json({ message: "Choose an image file to upload." });
        }
        if (!ALLOWED_PICTURE_MIME_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Profile picture must be a PNG, JPEG, or WebP image." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.profilePicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        await user.save();

        res.json({ user: sanitizeUser(user) });
    } catch (err) {
        console.error("Profile picture upload error:", err);
        res.status(500).json({ message: err.message || "Unable to upload profile picture." });
    }
};

exports.removeProfilePicture = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Provide a Bearer auth token." });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.profilePicture = '';
        await user.save();

        res.json({ user: sanitizeUser(user) });
    } catch (err) {
        console.error("Profile picture removal error:", err);
        res.status(500).json({ message: err.message || "Unable to remove profile picture." });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Provide a Bearer auth token." });

        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: "Enter your password to confirm account deletion." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Password is incorrect." });
        }

        await Module.deleteMany({ user: userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: "Account deleted." });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ message: err.message || "Unable to delete account." });
    }
};
