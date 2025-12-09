import React from 'react';
import { useCourses } from '@/hooks/useCourses';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Courses = () => {
  const { courses, loading, error } = useCourses();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading courses: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Courses</h1>
      {courses.length === 0 ? (
        <div>No courses enrolled.</div>
      ) : (
        courses.map(course => (
          <Card key={course.id} title={course.name} content={`Credits: ${course.credits}`}>
            <Button onClick={() => alert(`Viewing details for ${course.name}`)}>View Details</Button>
          </Card>
        ))
      )}
    </div>
  );
};

export default Courses;