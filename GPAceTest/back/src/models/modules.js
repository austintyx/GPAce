const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  academicYear: { type: String, required: true },  
  code: { type: String, required: true },
  name: { type: String, required: true },
  credits: { type: Number, required: true },
  type: { type: String },
  moduleCategory: {
    type: String,
    enum: ['Core', 'MPE', 'ICC', 'BDE', 'Uncategorised'],
    default: 'Uncategorised'
  },
  isBde: { type: Boolean, default: false },
  prerequisite: { type: String },
  gpaBucket: {
    type: String,
    enum: ['primary', 'secondary', 'shared', 'excluded', 'unassigned'],
    default: 'primary'
  },
  grade: { type: String,enum: ['A+','A','A-','B+','B','B-','C+','C','D+','D','F','P','U','-','EX','PASS'],
    default: '-'
    },
  status: { type: String, enum: ['Completed', 'In Progress', 'Planned'],
    default: 'Planned'
  },
});

moduleSchema.index({ user: 1, code: 1, academicYear: 1 }, { unique: true });

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
