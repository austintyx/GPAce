import { Request, Response } from 'express';
import Document from '../models/Document';
import { parseDocument } from '../services/documentParser';

// Upload a document
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const parsedData = await parseDocument(file);
    const newDocument = new Document({
      userId: req.user.id,
      title: parsedData.title,
      content: parsedData.content,
      createdAt: new Date(),
    });

    await newDocument.save();
    res.status(201).json(newDocument);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error });
  }
};

// Get all documents for a user
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await Document.find({ userId: req.user.id });
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error });
  }
};

// Delete a document
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Document.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error });
  }
};