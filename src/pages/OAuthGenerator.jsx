import React from 'react';
import OAuthUrlGenerator from '../components/integrations/OAuthUrlGenerator';

export default function OAuthGeneratorPage() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">OAuth URL Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate your Google Calendar OAuth URL using your Google Cloud Console credentials.
        </p>
      </div>
      <OAuthUrlGenerator />
    </div>
  );
}