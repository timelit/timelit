
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import { notificationManager } from "./NotificationManager";

export default function NotificationPermission() {
  const [permission, setPermission] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(notificationManager.isSupported());
    setPermission(notificationManager.getPermissionStatus());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationManager.requestPermission();
    setPermission(granted ? "granted" : "denied");
  };

  const handleTestNotification = () => {
    notificationManager.showNotification({
      id: "test",
      title: "Test Notification",
      start_time: new Date().toISOString()
    });
  };

  if (!isSupported) {
    return (
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-neutral-100">
            <BellOff className="w-5 h-5 text-neutral-400" />
            Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">
            Your browser doesn't support system notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-800 border-neutral-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-neutral-100">
          <Bell className="w-5 h-5 text-primary" />
          System Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === "granted" && (
          <div className="flex items-center gap-2 text-green-400">
            <Bell className="w-4 h-4" />
            <span className="text-sm">Notifications are enabled</span>
          </div>
        )}

        {permission === "denied" && (
          <div className="flex items-center gap-2 text-red-400">
            <BellOff className="w-4 h-4" />
            <span className="text-sm">Notifications are blocked</span>
          </div>
        )}

        {permission === "default" && (
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Permission not requested</span>
          </div>
        )}

        <div className="flex gap-2">
          {permission !== "granted" && (
            <Button onClick={handleRequestPermission} variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-700">
              Enable Notifications
            </Button>
          )}
          
          {permission === "granted" && (
            <Button onClick={handleTestNotification} variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-700">
              Test Notification
            </Button>
          )}
        </div>

        <p className="text-xs text-neutral-400">
          System notifications will appear outside your browser window to remind you of upcoming tasks and events.
        </p>
      </CardContent>
    </Card>
  );
}
