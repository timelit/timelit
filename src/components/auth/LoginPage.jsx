import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    // Always redirect to main app - no authentication required
    window.location.href = '/';
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    // Direct redirect to main app
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/timelit-logo.png"
              alt="Timelit" 
              className="w-16 h-16 rounded-xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to Timelit</h1>
          <p className="text-neutral-400 text-lg">Simple task management - no account required</p>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-8 shadow-2xl border border-neutral-800">
          <Button
            onClick={handleContinue}
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Continue to Timelit
              </>
            )}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-500">
              Start managing your tasks immediately - no setup required
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            Organize your time. Achieve your goals.
          </p>
        </div>
      </div>
    </div>
  );
}