import { Course } from '@/types';

export const calculateGPA = (courses: Course[]): number => {
  const totalPoints = courses.reduce((acc, course) => {
    return acc + (course.grade * course.credits);
  }, 0);

  const totalCredits = courses.reduce((acc, course) => acc + course.credits, 0);

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
};

export const generateGradeCombinations = (grades: string[], credits: number[]): string[][] => {
  const combinations: string[][] = [];

  const generate = (current: string[], index: number) => {
    if (index === grades.length) {
      combinations.push([...current]);
      return;
    }

    generate(current, index + 1);
    current.push(grades[index]);
    generate(current, index + 1);
    current.pop();
  };

  generate([], 0);
  return combinations;
};

export const calculateProjectedGPA = (currentGPA: number, additionalCredits: number, additionalPoints: number): number => {
  const totalPoints = currentGPA * additionalCredits + additionalPoints;
  const totalCredits = additionalCredits + additionalCredits;

  return totalCredits > 0 ? totalPoints / totalCredits : 0;
};