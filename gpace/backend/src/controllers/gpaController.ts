import { Request, Response } from 'express';
import { calculateGPA, getGPAHistory } from '../services/gpaCalculator';

// Controller for GPA-related operations
export const getCurrentGPA = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request
    const gpa = await calculateGPA(userId);
    res.status(200).json({ gpa });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating GPA', error });
  }
};

export const getGPAHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request
    const history = await getGPAHistory(userId);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving GPA history', error });
  }
};