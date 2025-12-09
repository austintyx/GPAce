import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CourseList from "@/components/gpa/CourseList";
import { Loader2 } from "lucide-react";

export default function Courses() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Courses</h1>
        <p className="text-slate-500 mt-2">Manage your academic history and future course plan.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <CourseList courses={courses} />
      </div>
    </div>
  );
}