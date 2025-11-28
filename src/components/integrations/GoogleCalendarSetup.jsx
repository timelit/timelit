import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../providers/DataProvider';

export default function GoogleCalendarSetup() {
  const { user, preferences, updatePreferences } = useData();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    if (preferences) {
      setIsConnected(preferences.google_calendar_integrated || false);
      setLastSync(preferences.last_google_calendar_sync);
      setSyncEnabled(preferences.google_calendar_sync_enabled || false);
    }
  }, [preferences]);

  // Update preferences when integration status changes
  useEffect(() => {
    if (preferences && preferences.google_calendar_integrated !== isConnected) {
      updatePreferences({
        ...preferences,
        google_calendar_integrated: isConnected,
        google_calendar_sync_enabled: syncEnabled,
        last_google_calendar_sync: lastSync
      }).catch(console.error);
    }
  }, [isConnected, syncEnabled, lastSync]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Redirect to Google OAuth
      window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/auth/google/calendar`;
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to initiate Google Calendar connection');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const { GoogleCalendar } = await import('../../api/integrations');
      const result = await GoogleCalendar.disconnect();

      if (result.success) {
        setIsConnected(false);
        setLastSync(null);
        setSyncEnabled(false);

        // Update preferences
        await updatePreferences({
          ...preferences,
          google_calendar_integrated: false,
          google_calendar_sync_enabled: false,
          last_google_calendar_sync: null
        });

        toast.success('Google Calendar disconnected successfully');
      } else {
        throw new Error(result.message || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToggle = async (enabled) => {
    setSyncEnabled(enabled);
    try {
      await updatePreferences({
        ...preferences,
        google_calendar_sync_enabled: enabled
      });
      toast.success(`Google Calendar sync ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Sync toggle error:', error);
      toast.error('Failed to update sync settings');
      setSyncEnabled(!enabled); // Revert on error
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      const { GoogleCalendar } = await import('../../api/integrations');
      const result = await GoogleCalendar.sync();

      if (result.success) {
        setLastSync(new Date().toISOString());
        await updatePreferences({
          ...preferences,
          last_google_calendar_sync: new Date().toISOString()
        });
        toast.success('Google Calendar synced successfully');
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? 'Connected to Google Calendar' : 'Not Connected'}
                </p>
                {lastSync && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync Now
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isLoading}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={handleConnect} disabled={isLoading}>
                  <Key className="w-4 h-4 mr-2" />
                  {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
                </Button>
              )}
            </div>
          </div>

          {/* Sync Settings */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync events between Timelit and Google Calendar
                  </p>
                </div>
                <Switch
                  checked={syncEnabled}
                  onCheckedChange={handleSyncToggle}
                />
              </div>

              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">What gets synced:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Timelit events → Google Calendar events</li>
                      <li>Google Calendar events → Timelit (read-only)</li>
                      <li>Changes are synced every 15 minutes when enabled</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Setup Instructions */}
          {!isConnected && (
            <Alert>
              <Key className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-semibold">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click "Connect Google Calendar" above</li>
                    <li>Sign in to your Google account</li>
                    <li>Grant calendar permissions to Timelit</li>
                    <li>You'll be redirected back and the integration will be active</li>
                  </ol>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Google Cloud Console
                      </a>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}