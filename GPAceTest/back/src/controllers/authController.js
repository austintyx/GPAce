const User = require('../models/user');

exports.signup = async (req, res) => {
    try {
        const { name, school, course, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered." });
        }

        // Create new user
        const user = new User({ name, school, course, email, password });
        await user.save();

        // Generate token
        const token = "token-" + Math.random().toString(36).slice(2, 10);

        res.status(201).json({ token, user: { id: user._id, name, email, school } });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Signup failed." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = "token-" + Math.random().toString(36).slice(2, 10);
        res.json({ token, user: { id: user._id, name: user.name, email } });
    } catch (err) {
        res.status(500).json({ message: "Login failed." });
    }
};