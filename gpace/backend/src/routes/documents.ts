import { Router } from 'express';
import { uploadDocument, getDocuments } from '../controllers/documentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Route for uploading documents
router.post('/upload', authenticate, uploadDocument);

// Route for retrieving documents
router.get('/', authenticate, getDocuments);

export default router;