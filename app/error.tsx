'use client';

import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6">An unexpected error occurred</p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
