import express from 'express';
import { createCourse, getCourses, getCourseById, updateCourse, deleteCourse } from '../controllers/courseController';

const router = express.Router();

// Route to create a new course
router.post('/', createCourse);

// Route to get all courses
router.get('/', getCourses);

// Route to get a specific course by ID
router.get('/:id', getCourseById);

// Route to update a course by ID
router.put('/:id', updateCourse);

// Route to delete a course by ID
router.delete('/:id', deleteCourse);

export default router;