import React, { useState } from 'react';

const GradePermutations = () => {
  const [grades, setGrades] = useState([]);
  const [permutations, setPermutations] = useState([]);

  const handleGradeChange = (index, value) => {
    const newGrades = [...grades];
    newGrades[index] = value;
    setGrades(newGrades);
  };

  const generatePermutations = () => {
    const results = getPermutations(grades);
    setPermutations(results);
  };

  const getPermutations = (array) => {
    if (array.length === 0) return [[]];
    const firstElement = array[0];
    const rest = array.slice(1);
    const permsWithoutFirst = getPermutations(rest);
    const allPerms = [];

    permsWithoutFirst.forEach((perm) => {
      for (let i = 0; i <= perm.length; i++) {
        const permWithFirst = [...perm.slice(0, i), firstElement, ...perm.slice(i)];
        allPerms.push(permWithFirst);
      }
    });

    return allPerms;
  };

  return (
    <div>
      <h2>Grade Permutations</h2>
      <div>
        {grades.map((grade, index) => (
          <input
            key={index}
            type="text"
            value={grade}
            onChange={(e) => handleGradeChange(index, e.target.value)}
            placeholder={`Grade ${index + 1}`}
          />
        ))}
        <button onClick={() => setGrades([...grades, ''])}>Add Grade</button>
      </div>
      <button onClick={generatePermutations}>Generate Permutations</button>
      <div>
        <h3>Permutations:</h3>
        <ul>
          {permutations.map((perm, index) => (
            <li key={index}>{perm.join(', ')}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GradePermutations;