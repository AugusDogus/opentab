"use client";

import { useEffect, useState } from "react";

export default function AuthSuccessPage() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 font-mono">
      <div className="space-y-6 text-center">
        {/* Simple checkmark */}
        <div className="mb-2 text-4xl text-emerald-400">✓</div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-lg font-medium">signed in</h1>
          <p className="text-sm text-neutral-500">you can close this tab</p>
        </div>

        {/* Countdown */}
        <p className="text-xs text-neutral-600">closing in {countdown}s</p>
      </div>

      {/* Branding */}
      <div className="fixed bottom-8 text-xs uppercase tracking-widest text-neutral-700">
        opentab
      </div>
    </main>
  );
}
