
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, RotateCcw, Bell, Calendar, Palette, Shield, Globe, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import NotificationPermission from "../components/notifications/NotificationPermission";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GoogleCalendarSetup from "../components/integrations/GoogleCalendarSetup";
import { useData } from "../components/providers/DataProvider";
import { useTheme } from "../components/providers/ThemeProvider";

export default function PreferencesPage() {
  const { user, preferences: contextPreferences, isLoading, error, updatePreferences } = useData();
  const [localPreferences, setLocalPreferences] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (contextPreferences) {
      setLocalPreferences(contextPreferences);
    }
  }, [contextPreferences]);

  const handleSave = async () => {
    if (!localPreferences) {
      toast.error("Preferences not loaded yet.");
      return;
    }
    setIsSaving(true);
    try {
      await updatePreferences(localPreferences);
      if (localPreferences.theme_preference) {
        setTheme(localPreferences.theme_preference);
      }
      toast.success("Preferences saved successfully!");
    } catch (err) {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) {
      toast.error("User not identified.");
      return;
    }

    setIsSaving(true);
    const defaultData = {
      default_task_priority: "medium",
      default_task_status: "todo",
      default_event_category: "personal",
      default_event_priority: "medium",
      default_event_duration: 60,
      auto_create_calendar_events: false,
      auto_schedule_tasks_into_calendar: false, // Added new preference default
      break_duration_between_tasks: 15, // Added
      max_consecutive_tasks: 3, // Added
      work_start_time: "09:00",
      work_end_time: "17:00",
      max_work_hours_per_day: 8, // Added
      notification_email: true,
      notification_sound: false,
      default_notification_timing: "15min",
      notification_for_tasks: true,
      notification_for_events: true,
      auto_delete_completed_tasks: false,
      show_completed_tasks: false,
      default_view: "week",
      weekend_visible: true,
      time_format: "12",
      theme_preference: "system",
      quick_add_location: "",
      backup_frequency: "weekly",
      google_calendar_integrated: false,
      last_google_calendar_sync: null,
    };

    try {
      // Create a temporary object for the optimistic update, keeping the ID and user email.
      const resetState = { ...localPreferences, ...defaultData, created_by: user.email };
      await updatePreferences(resetState);
      
      if (resetState.theme_preference) {
        setTheme(resetState.theme_preference);
      }
      toast.success("Preferences reset to defaults!");
    } catch (err) {
      toast.error("Failed to reset preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    if (localPreferences) {
      setLocalPreferences(prev => ({ ...prev, [key]: value }));
    }
  };

  if (isLoading && !localPreferences) {
    return (
      <div className="p-6 flex items-center justify-center h-full bg-background">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <span className="text-lg font-medium text-foreground">Loading preferences...</span>
        </div>
      </div>
    );
  }

  if (error && !localPreferences) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full bg-background text-foreground">
        <div className="text-center bg-destructive/10 p-6 rounded-lg border border-destructive/20 max-w-md">
          <div className="flex justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-lg font-medium mb-2 text-destructive-foreground">Error loading preferences</p>
          <p className="text-sm mb-4 text-destructive-foreground/80">{error}</p>
          <Button onClick={() => window.location.reload()} variant="destructive">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!localPreferences) {
     return (
      <div className="p-6 flex items-center justify-center h-full bg-background">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <span className="text-lg font-medium text-foreground">Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Preferences
            </h1>
            <p className="text-muted-foreground mt-2">Customize your Timelit experience</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} disabled={isSaving} className="text-foreground border-border">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card border-border">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Task Defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-foreground">Default Task Priority</Label>
                      <Select
                        value={localPreferences?.default_task_priority || "medium"}
                        onValueChange={(value) => updatePreference('default_task_priority', value)}
                      >
                        <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-foreground">Default Task Status</Label>
                      <Select
                        value={localPreferences?.default_task_status || "todo"}
                        onValueChange={(value) => updatePreference('default_task_status', value)}
                      >
                        <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">Show Completed Tasks</Label>
                        <p className="text-sm text-muted-foreground mt-1">Display completed tasks at bottom of task list and on calendar</p>
                      </div>
                      <Switch
                        checked={localPreferences?.show_completed_tasks || false}
                        onCheckedChange={(checked) => updatePreference('show_completed_tasks', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Event Defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-foreground">Default Event Category</Label>
                      <Select
                        value={localPreferences?.default_event_category || "personal"}
                        onValueChange={(value) => updatePreference('default_event_category', value)}
                      >
                        <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="appointment">Appointment</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-foreground">Default Event Priority</Label>
                      <Select
                        value={localPreferences?.default_event_priority || "medium"}
                        onValueChange={(value) => updatePreference('default_event_priority', value)}
                      >
                        <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-foreground">Default Event Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        value={localPreferences?.default_event_duration || 60}
                        onChange={(e) => updatePreference('default_event_duration', parseInt(e.target.value))}
                        className="mt-2 bg-background text-foreground border-border"
                      />
                    </div>

                    <div>
                      <Label className="text-foreground">Quick Add Default Location</Label>
                      <Input
                        value={localPreferences?.quick_add_location || ""}
                        onChange={(e) => updatePreference('quick_add_location', e.target.value)}
                        placeholder="e.g., Office Conference Room"
                        className="mt-2 bg-background text-foreground border-border"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    Calendar Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-foreground">Default Calendar View</Label>
                    <Select
                      value={localPreferences?.default_view || "week"}
                      onValueChange={(value) => updatePreference('default_view', value)}
                    >
                      <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-foreground">Time Format</Label>
                    <Select
                      value={localPreferences?.time_format || "12"}
                      onValueChange={(value) => updatePreference('time_format', value)}
                    >
                      <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Show Weekends</Label>
                      <p className="text-sm text-muted-foreground mt-1">Display weekends in calendar views</p>
                    </div>
                    <Switch
                      checked={localPreferences?.weekend_visible || false}
                      onCheckedChange={(checked) => updatePreference('weekend_visible', checked)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">Work Day Start</Label>
                      <Input
                        type="time"
                        value={localPreferences?.work_start_time || "09:00"}
                        onChange={(e) => updatePreference('work_start_time', e.target.value)}
                        className="mt-2 bg-background text-foreground border-border"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground">Work Day End</Label>
                      <Input
                        type="time"
                        value={localPreferences?.work_end_time || "17:00"}
                        onChange={(e) => updatePreference('work_end_time', e.target.value)}
                        className="mt-2 bg-background text-foreground border-border"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <NotificationPermission />

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Bell className="w-5 h-5 text-orange-500" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground mt-1">Receive email reminders for upcoming events</p>
                    </div>
                    <Switch
                      checked={localPreferences?.notification_email || false}
                      onCheckedChange={(checked) => updatePreference('notification_email', checked)}
                      disabled={!user?.email} // Disable if no email is set for user
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground mt-1">Play sounds for notifications</p>
                    </div>
                    <Switch
                      checked={localPreferences?.notification_sound || false}
                      onCheckedChange={(checked) => updatePreference('notification_sound', checked)}
                    />
                  </div>

                  <div>
                    <Label className="text-foreground">Default Notification Timing</Label>
                    <Select
                      value={localPreferences?.default_notification_timing || "15min"}
                      onValueChange={(value) => updatePreference('default_notification_timing', value)}
                    >
                      <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No notifications</SelectItem>
                        <SelectItem value="5min">5 minutes before</SelectItem>
                        <SelectItem value="15min">15 minutes before</SelectItem>
                        <SelectItem value="30min">30 minutes before</SelectItem>
                        <SelectItem value="1hour">1 hour before</SelectItem>
                        <SelectItem value="1day">1 day before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Task Notifications</Label>
                      <p className="text-sm text-muted-foreground mt-1">Enable notifications for tasks</p>
                    </div>
                    <Switch
                      checked={localPreferences?.notification_for_tasks || false}
                      onCheckedChange={(checked) => updatePreference('notification_for_tasks', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Event Notifications</Label>
                      <p className="text-sm text-muted-foreground mt-1">Enable notifications for events</p>
                    </div>
                    <Switch
                      checked={localPreferences?.notification_for_events || false}
                      onCheckedChange={(checked) => updatePreference('notification_for_events', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-purple-500" />
                    Smart Features & Automation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Auto-schedule tasks into calendar</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically find a time slot and create an event for new tasks.
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences?.auto_schedule_tasks_into_calendar || false}
                      onCheckedChange={(checked) => updatePreference('auto_schedule_tasks_into_calendar', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Auto-create Calendar Events</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically create calendar events when adding tasks via quick add
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences?.auto_create_calendar_events || false}
                      onCheckedChange={(checked) => updatePreference('auto_create_calendar_events', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Auto-delete Completed Tasks</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically delete completed tasks after 30 days
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences?.auto_delete_completed_tasks || false}
                      onCheckedChange={(checked) => updatePreference('auto_delete_completed_tasks', checked)}
                    />
                  </div>
                  
                  <Separator />

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-foreground">Break Duration Between Tasks (minutes)</Label>
                       <p className="text-sm text-muted-foreground mt-1">
                          Set a default break time after each automatically scheduled task.
                        </p>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={localPreferences?.break_duration_between_tasks || 15}
                        onChange={(e) => updatePreference('break_duration_between_tasks', parseInt(e.target.value))}
                        className="mt-2 bg-background text-foreground border-border w-full"
                      />
                    </div>

                    <div>
                      <Label className="text-foreground">Max Consecutive Tasks</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                          Limit how many tasks are scheduled back-to-back.
                      </p>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={localPreferences?.max_consecutive_tasks || 3}
                        onChange={(e) => updatePreference('max_consecutive_tasks', parseInt(e.target.value))}
                        className="mt-2 bg-background text-foreground border-border w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-foreground">Max Work Hours Per Day</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                        Set a daily limit for total hours of scheduled work.
                    </p>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      step="1"
                      value={localPreferences?.max_work_hours_per_day || 8}
                      onChange={(e) => updatePreference('max_work_hours_per_day', parseInt(e.target.value))}
                      className="mt-2 bg-background text-foreground border-border w-48"
                    />
                  </div>


                  <div>
                    <Label className="text-foreground">Data Backup Frequency</Label>
                    <Select
                      value={localPreferences?.backup_frequency || "weekly"}
                      onValueChange={(value) => updatePreference('backup_frequency', value)}
                    >
                      <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <GoogleCalendarSetup />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
