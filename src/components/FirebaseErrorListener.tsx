'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // In a real app, you might want to log this to a service like Sentry
      // For this example, we'll just throw it to make it visible in the Next.js overlay
      console.error("Firebase Permission Error Detected:", error);
      // We throw the error to make it visible in the Next.js development error overlay.
      // This is for development purposes only. In production, you'd handle this gracefully.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
