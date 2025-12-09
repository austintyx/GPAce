// This file exports TypeScript types and interfaces used throughout the frontend application.

export interface Course {
  id: string;
  title: string;
  credits: number;
  grade: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  courses: Course[];
}

export interface GPAPlan {
  targetGPA: number;
  currentGPA: number;
  courses: Course[];
}

export interface Document {
  id: string;
  title: string;
  url: string;
  uploadedAt: Date;
}