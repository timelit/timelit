import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function GoogleOAuthInstructions() {
  const redirectUri = `${window.location.origin}/Preferences`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success('Redirect URI copied to clipboard!');
  };

  return (
    <div className="p-6 md:p-8 h-full bg-neutral-900 text-neutral-100">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to={createPageUrl('Preferences')}>
            <Button variant="ghost" className="mb-4 text-neutral-300 hover:bg-neutral-800 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Preferences
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Google Calendar Setup Instructions</h1>
          <p className="text-neutral-400 mt-2">
            Follow these steps to resolve the "redirect_uri_mismath" error and connect your Google Calendar.
          </p>
        </div>

        <Card className="bg-neutral-950 border-neutral-800">
          <CardHeader>
            <CardTitle>Step 1: Copy the Authorized Redirect URI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-300 mb-4">
              This is the exact URL that must be added to your Google Cloud project's settings.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-md bg-neutral-800 border border-neutral-700">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none"
              />
              <Button size="icon" variant="ghost" onClick={copyToClipboard} className="hover:bg-neutral-700">
                <Copy className="w-4 h-4 text-neutral-400" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-neutral-950 border-neutral-800">
          <CardHeader>
            <CardTitle>Step 2: Add the URI to Google Cloud Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full border-blue-500/50 text-blue-300 hover:bg-blue-950 hover:text-blue-200">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Google Cloud Console Credentials
              </Button>
            </a>

            <ol className="list-decimal list-inside space-y-3 text-neutral-300 pl-2">
              <li>In the Google Cloud Console, find the <strong>OAuth 2.0 Client IDs</strong> section.</li>
              <li>Click on the name of the client ID you are using for this application.</li>
              <li>Scroll down to the <strong>Authorized redirect URIs</strong> section.</li>
              <li>Click the <strong>+ ADD URI</strong> button.</li>
              <li>Paste the URI you copied in Step 1 into the new field.</li>
              <li>Click the <strong>Save</strong> button at the bottom of the page.</li>
            </ol>
            
            <Alert className="bg-yellow-950 border-yellow-700 text-yellow-200">
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                After saving, it might take a minute or two for the changes to apply. Once you've completed these steps, return to the Preferences page and try connecting again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}