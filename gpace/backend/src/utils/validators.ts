import { body, validationResult } from 'express-validator';

export const validateGPAInput = [
  body('grades')
    .isArray()
    .withMessage('Grades must be an array of numbers.')
    .custom((value) => {
      if (!value.every((grade) => typeof grade === 'number')) {
        throw new Error('All grades must be numbers.');
      }
      return true;
    }),
  body('credits')
    .isArray()
    .withMessage('Credits must be an array of numbers.')
    .custom((value) => {
      if (!value.every((credit) => typeof credit === 'number')) {
        throw new Error('All credits must be numbers.');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateCourseInput = [
  body('name')
    .isString()
    .withMessage('Course name must be a string.')
    .notEmpty()
    .withMessage('Course name cannot be empty.'),
  body('credits')
    .isNumeric()
    .withMessage('Credits must be a number.')
    .notEmpty()
    .withMessage('Credits cannot be empty.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];