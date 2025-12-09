export interface User {
  id: string;
  username: string;
  email: string;
  courses: Course[];
}

export interface Course {
  id: string;
  name: string;
  credits: number;
  grade: number;
}

export interface GPAData {
  totalCredits: number;
  totalPoints: number;
  gpa: number;
}

export interface Document {
  id: string;
  title: string;
  url: string;
  uploadedAt: Date;
}