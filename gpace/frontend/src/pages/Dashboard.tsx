import React from 'react';
import { Link } from 'react-router-dom';
import { GradeCalculator } from '@/components/GradeCalculator';
import { GradePermutations } from '@/components/GradePermutations';

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="mb-6">Welcome to your GPA monitoring and planning dashboard!</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Calculate Your GPA</h2>
        <GradeCalculator />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Plan Your GPA</h2>
        <GradePermutations />
      </section>
    </div>
  );
};

export default Dashboard;