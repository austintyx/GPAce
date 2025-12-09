import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
  title: {
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
  semester: {
    type: String,
    required: true,
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F', 'Incomplete'],
    default: 'Incomplete',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const Course = model('Course', courseSchema);

export default Course;