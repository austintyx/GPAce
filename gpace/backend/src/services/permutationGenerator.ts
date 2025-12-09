import { Grade } from '../types';

export const generateGradePermutations = (grades: Grade[]): Grade[][] => {
  const results: Grade[][] = [];

  const permute = (arr: Grade[], memo: Grade[] = []) => {
    if (arr.length === 0) {
      results.push(memo);
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      const curr = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      permute(remaining, memo.concat(curr));
    }
  };

  permute(grades);
  return results;
};