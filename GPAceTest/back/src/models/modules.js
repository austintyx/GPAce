import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  academicYear: { type: String, required: true },  
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  credits: { type: Number, required: true },
  grade: { type: String,enum: ['A+','A','A-','B+','B','B-','C+','C','D+','D','F','P','U','-'],
    default: '-'
    },
  status: { type: String, enum: ['Completed', 'In Progress', 'Planned'],
    default: 'Planned'
  },
});

const Module = mongoose.model('Module', moduleSchema);

export default Module;