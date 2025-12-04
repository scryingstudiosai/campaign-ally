'use client';

import { Loader2 } from 'lucide-react';

export function DetailLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-10 w-10 animate-spin text-teal-500 mb-4" />
      <p className="text-gray-400 text-sm">Loading details...</p>
    </div>
  );
}
