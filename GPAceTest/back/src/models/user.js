const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true},
  school: { type: String, required: true },
  course: { type: String },
  isDoubleDegree: { type: Boolean, default: false },
  primaryDegreeName: { type: String },
  secondaryDegreeName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  academicYear: { type: String },
  profilePicture: { type: String, default: '' }
});

module.exports = mongoose.model('User', userSchema);
