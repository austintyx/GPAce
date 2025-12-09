import { Schema, model } from 'mongoose';

const moduleSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  credits: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  semester: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

const Module = model('Module', moduleSchema);

export default Module;