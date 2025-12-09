const bcrypt = require('bcrypt');

// /Users/austinteo/Documents/GitHub/GPAce/GPAceTest/back/src/controllers/registrationController.js
// RegistrationController: handles user registration and persists to MongoDB using Mongoose.
// Requires: ../models/User (a Mongoose model). Ensure mongoose.connect(...) is called in app startup.


// If you don't have a User model yet, create one at ../models/User.js with at least:
// const mongoose = require('mongoose');
// const UserSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { type: String, default: 'user' },
//   createdAt: { type: Date, default: Date.now }
// });
// module.exports = mongoose.model('User', UserSchema);

let User;
try {
    // Attempt to require the User model; if not present, the app should create it as shown above.
    User = require('../models/user');
} catch (err) {
    // If the model isn't found, throw a clear error at runtime to help debugging.
    throw new Error(
        "User model not found at ../models/User. Create a Mongoose model there before using RegistrationController."
    );
}

class RegistrationController {
    // POST /register
    // Expects JSON body: { name, email, password, role? }
    static async register(req, res) {
        try {
            const { name, email, password, school, degreeProgram, academicYear } = req.body || {};

            // Basic validation
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: 'name, email and password are required.' });
            }
            if (!RegistrationController.validateEmail(email)) {
                return res.status(400).json({ success: false, message: 'Invalid email format.' });
            }
            if (!RegistrationController.validatePassword(password)) {
                return res.status(400).json({ success: false, message: 'Password must have at least 8 characters, a special character, and a number.' });
            }

            // Check for existing user
            const existing = await User.findOne({ email: email.toLowerCase().trim() }).exec();
            if (existing) {
                return res.status(409).json({ success: false, message: 'Email already registered.' });
            }

            // Hash password
            const hashed = await bcrypt.hash(password, 10);

            // Create user
            const user = new User({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashed,
                school: school.trim(),
                degreeProgram: degreeProgram.trim(),
                academicYear: academicYear.trim()
            });

            await user.save();

            // Respond with sanitized user (no password)
            const responseUser = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            };

            return res.status(201).json({ success: true, data: responseUser });
        } catch (err) {
            // Log the error server-side; return generic message to client.
            // Replace console.error with your logger if available.
            console.error('Registration error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    }

    // Utility: validate email with a simple regex
    static validateEmail(email) {
        if (typeof email !== 'string') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePassword(password) {
        if (typeof password !== 'string') return false;
        // At least 8 chars, one special char, one number
        const re = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
        return re.test(password);
    }
}

module.exports = RegistrationController;