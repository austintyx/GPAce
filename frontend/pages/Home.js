import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('Dashboard'));
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}