import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function OAuthUrlGenerator() {
  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState(`${window.location.origin}/auth/google/callback`);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const generateOAuthUrl = () => {
    if (!clientId.trim()) {
      toast.error('Please enter your Client ID');
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId.trim(),
      redirect_uri: redirectUri.trim(),
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    setGeneratedUrl(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success('OAuth URL copied to clipboard!');
  };

  const openUrl = () => {
    window.open(generatedUrl, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Google Calendar OAuth URL Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clientId">Google Client ID *</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc123def456.apps.googleusercontent.com"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              From Google Cloud Console → APIs & Services → Credentials
            </p>
          </div>

          <div>
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <Input
              id="redirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://your-app.timelit.com/auth/google/callback"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Should match what you set in Google Cloud Console
            </p>
          </div>

          <Button onClick={generateOAuthUrl} className="w-full">
            Generate OAuth URL
          </Button>

          {generatedUrl && (
            <Alert>
              <Key className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-semibold">Your OAuth URL:</p>
                  <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono">
                    {generatedUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button variant="outline" size="sm" onClick={openUrl}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {generatedUrl && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click "Open in New Tab" or copy the URL</li>
                    <li>Sign in to your Google account</li>
                    <li>Grant calendar permissions</li>
                    <li>Google will redirect you back with an authorization code</li>
                    <li>Use that code to complete the integration</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}