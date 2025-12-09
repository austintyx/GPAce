import React, { useState } from 'react';

const GradeCalculator = () => {
  const [grades, setGrades] = useState([{ course: '', grade: '' }]);
  const [gpa, setGpa] = useState(null);

  const handleGradeChange = (index, event) => {
    const newGrades = [...grades];
    newGrades[index][event.target.name] = event.target.value;
    setGrades(newGrades);
  };

  const addGradeField = () => {
    setGrades([...grades, { course: '', grade: '' }]);
  };

  const calculateGPA = () => {
    const totalPoints = grades.reduce((acc, curr) => {
      const gradeValue = parseFloat(curr.grade);
      return acc + (isNaN(gradeValue) ? 0 : gradeValue);
    }, 0);
    const gpaValue = totalPoints / grades.length;
    setGpa(gpaValue);
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-bold mb-4">GPA Calculator</h2>
      {grades.map((grade, index) => (
        <div key={index} className="flex items-center mb-2">
          <input
            type="text"
            name="course"
            placeholder="Course Name"
            value={grade.course}
            onChange={(event) => handleGradeChange(index, event)}
            className="border p-2 rounded mr-2"
          />
          <input
            type="number"
            name="grade"
            placeholder="Grade"
            value={grade.grade}
            onChange={(event) => handleGradeChange(index, event)}
            className="border p-2 rounded mr-2"
          />
        </div>
      ))}
      <button onClick={addGradeField} className="bg-indigo-600 text-white p-2 rounded mb-4">
        Add Another Course
      </button>
      <button onClick={calculateGPA} className="bg-green-600 text-white p-2 rounded">
        Calculate GPA
      </button>
      {gpa !== null && (
        <div className="mt-4">
          <h3 className="font-bold">Your GPA: {gpa.toFixed(2)}</h3>
        </div>
      )}
    </div>
  );
};

export default GradeCalculator;