import { Schema, model } from 'mongoose';

const documentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  courseId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Course',
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const Document = model('Document', documentSchema);

export default Document;