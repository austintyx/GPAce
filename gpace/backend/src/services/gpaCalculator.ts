import { Course } from '../models/Course';

export interface Grade {
  courseId: string;
  grade: number;
  credits: number;
}

export function calculateGPA(grades: Grade[]): number {
  if (grades.length === 0) return 0;

  let totalPoints = 0;
  let totalCredits = 0;

  grades.forEach(({ grade, credits }) => {
    totalPoints += grade * credits;
    totalCredits += credits;
  });

  return parseFloat((totalPoints / totalCredits).toFixed(2));
}

export function getGPAForCourses(courses: Course[], grades: Grade[]): { [key: string]: number } {
  const gpaResults: { [key: string]: number } = {};

  courses.forEach(course => {
    const courseGrades = grades.filter(grade => grade.courseId === course.id);
    gpaResults[course.name] = calculateGPA(courseGrades);
  });

  return gpaResults;
}