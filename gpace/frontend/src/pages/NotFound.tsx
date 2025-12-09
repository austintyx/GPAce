import React from 'react';

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo-600">404</h1>
        <p className="mt-4 text-lg text-slate-600">Oops! The page you are looking for does not exist.</p>
        <p className="mt-2 text-sm text-slate-500">You can go back to the <a href="/" className="text-indigo-600 hover:underline">homepage</a>.</p>
      </div>
    </div>
  );
};

export default NotFound;