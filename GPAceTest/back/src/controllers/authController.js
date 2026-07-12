const bcrypt = require('bcrypt');
const User = require('../models/user');
const mongoose = require('mongoose');

function sanitizeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        school: user.school,
        course: user.course,
        isDoubleDegree: Boolean(user.isDoubleDegree),
        primaryDegreeName: user.primaryDegreeName || user.course || '',
        secondaryDegreeName: user.secondaryDegreeName || ''
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

        const { name, school, course, email, password, isDoubleDegree, primaryDegreeName, secondaryDegreeName } = req.body;

        if (!name || !school || !email || !password) {
            return res.status(400).json({ message: "Name, school, email and password are required." });
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
            school: school.trim(),
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

        const { isDoubleDegree, primaryDegreeName, secondaryDegreeName } = req.body;
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
