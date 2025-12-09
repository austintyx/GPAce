const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true},
  school: { type: String, required: true },
  course: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  academicYear: { type: String },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
});

module.exports = mongoose.model('User', userSchema);