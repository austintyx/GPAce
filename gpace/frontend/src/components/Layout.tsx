import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, LayoutDashboard } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">GPAce</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link 
            to={createPageUrl('Dashboard')} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/') || isActive('/Dashboard')}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to={createPageUrl('Courses')} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/Courses')}`}
          >
            <GraduationCap className="w-5 h-5" />
            My Courses
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              GP
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Student</p>
              <p className="text-xs text-slate-500 truncate">View Profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-md">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">GPAce</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="md:pl-64 pt-6 md:pt-0 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default Layout;