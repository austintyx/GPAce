import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import GpaStats from "@/components/gpa/GpaStats";
import TranscriptUploader from "@/components/gpa/TranscriptUploader";
import CourseList from "@/components/gpa/CourseList";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: courses, isLoading, refetch } = useQuery({
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Dashboard</h1>
        <p className="text-slate-500 mt-2">Track your progress and plan your path to graduation.</p>
      </div>

      <GpaStats courses={courses} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <CourseList courses={courses} />
           </div>
        </div>

        <div className="space-y-6">
          <div>
             <h3 className="font-semibold text-slate-900 mb-4">Import Data</h3>
             <TranscriptUploader onUploadComplete={refetch} />
          </div>
          
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
             <h3 className="font-semibold text-indigo-900 mb-2">How it works</h3>
             <ul className="space-y-2 text-sm text-indigo-700/80">
               <li className="flex gap-2">
                 <span className="font-bold">•</span>
                 Upload your course outline or transcript PDF.
               </li>
               <li className="flex gap-2">
                 <span className="font-bold">•</span>
                 We automatically extract course codes, credits, and grades.
               </li>
               <li className="flex gap-2">
                 <span className="font-bold">•</span>
                 Set your goal GPA to see what grades you need in future courses.
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
