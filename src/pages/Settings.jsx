import React, { useState } from "react";
import { useData } from "../components/providers/DataProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, Calendar, Clock, Palette, Zap, Shield, Trash2, BarChart2, 
  Sparkles, Target, TrendingUp, ListChecks, Timer, Heart, Gauge,
  Settings as SettingsIcon, Layout, Monitor
} from "lucide-react";
import { toast } from "sonner";
import { timelit } from "@/api/timelitClient";
import NotificationPermission from "../components/notifications/NotificationPermission";

export default function SettingsPage() {
  const { user, preferences, updatePreferences, isLoading } = useData();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentSection, setCurrentSection] = useState("general");

  const handlePreferenceChange = async (key, value) => {
    try {
      await updatePreferences({ [key]: value });
      toast.success("Settings updated");
    } catch (error) {
      console.error("Failed to update preference:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete your account and ALL your data (tasks, events, preferences). This action CANNOT be undone. Are you absolutely sure?"
    );
    
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "This is your last chance. Type 'DELETE' in the next prompt to confirm account deletion."
    );
    
    if (!doubleConfirm) return;

    const userInput = prompt("Type 'DELETE' to confirm:");
    if (userInput !== 'DELETE') {
      toast.error("Account deletion cancelled");
      return;
    }

    setIsDeleting(true);
    try {
      await timelit.functions.deleteUserAccount();
      toast.success("Account deleted. Logging out...");
      setTimeout(() => {
        timelit.auth.logout();
      }, 2000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-900">
        <div className="text-sm text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  const sections = {
    general: "General",
    appearance: "Appearance",
    automation: "Automation",
    notifications: "Notifications",
    widgets: "Widgets",
    advanced: "Advanced",
    account: "Account"
  };

  return (
    <div className="h-full overflow-y-auto bg-neutral-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8" />
                Settings
              </h1>
              <p className="text-neutral-400 mt-1">Customize your Timelit experience</p>
            </div>
            <Select value={currentSection} onValueChange={setCurrentSection}>
              <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                {Object.entries(sections).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-neutral-100">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {currentSection === "general" && (
          <div className="space-y-6">
            {/* Calendar & Tasks Section */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Calendar & Tasks</h2>
                      <p className="text-neutral-400 mt-1">Configure default settings and behaviors</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-neutral-200">Default Task Priority</Label>
                        <Select
                          value={preferences.default_task_priority || 'medium'}
                          onValueChange={(value) => handlePreferenceChange('default_task_priority', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-neutral-200">Default Task Status</Label>
                        <Select
                          value={preferences.default_task_status || 'todo'}
                          onValueChange={(value) => handlePreferenceChange('default_task_status', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-neutral-700" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Show Completed Tasks</Label>
                          <p className="text-sm text-neutral-400">Display completed tasks in task list</p>
                        </div>
                        <Switch
                          checked={preferences.show_completed_tasks || false}
                          onCheckedChange={(checked) => handlePreferenceChange('show_completed_tasks', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Auto-Delete Completed Tasks</Label>
                          <p className="text-sm text-neutral-400">Automatically delete tasks after completion</p>
                        </div>
                        <Switch
                          checked={preferences.auto_delete_completed_tasks || false}
                          onCheckedChange={(checked) => handlePreferenceChange('auto_delete_completed_tasks', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Mode Section */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Schedule Mode</h2>
                      <p className="text-neutral-400 mt-1">Define your availability for auto-scheduling</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-neutral-200">Mode</Label>
                      <Select
                        value={preferences.schedule_mode || 'work'}
                        onValueChange={(value) => handlePreferenceChange('schedule_mode', value)}
                      >
                        <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-700 border-neutral-600">
                          <SelectItem value="work">Work (9 AM - 5 PM)</SelectItem>
                          <SelectItem value="school">School (8 AM - 3 PM)</SelectItem>
                          <SelectItem value="flexible">Flexible (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {preferences.schedule_mode === 'flexible' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-neutral-200">Start Time</Label>
                          <Input
                            type="time"
                            value={preferences.work_start_time || '09:00'}
                            onChange={(e) => handlePreferenceChange('work_start_time', e.target.value)}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-neutral-200">End Time</Label>
                          <Input
                            type="time"
                            value={preferences.work_end_time || '17:00'}
                            onChange={(e) => handlePreferenceChange('work_end_time', e.target.value)}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>
                      </div>
                    )}

                    <Separator className="bg-neutral-700" />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-neutral-200 text-base">Lunch Break</Label>
                        <p className="text-sm text-neutral-400">Block time for lunch</p>
                      </div>
                      <Switch
                        checked={preferences.lunch_break_enabled || false}
                        onCheckedChange={(checked) => handlePreferenceChange('lunch_break_enabled', checked)}
                      />
                    </div>

                    {preferences.lunch_break_enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-neutral-200">Lunch Time</Label>
                          <Input
                            type="time"
                            value={preferences.lunch_break_start || '12:00'}
                            onChange={(e) => handlePreferenceChange('lunch_break_start', e.target.value)}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-neutral-200">Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={preferences.lunch_break_duration || 60}
                            onChange={(e) => handlePreferenceChange('lunch_break_duration', parseInt(e.target.value))}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "appearance" && (
          <div className="space-y-6">
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Palette className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Appearance</h2>
                      <p className="text-neutral-400 mt-1">Customize how Timelit looks</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-neutral-200">Theme</Label>
                        <p className="text-sm text-neutral-400 mb-2">Choose your preferred theme</p>
                        <Select
                          value={preferences.theme_preference || 'system'}
                          onValueChange={(value) => handlePreferenceChange('theme_preference', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <Monitor className="w-4 h-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-neutral-200">Time Format</Label>
                        <p className="text-sm text-neutral-400 mb-2">12-hour or 24-hour clock</p>
                        <Select
                          value={preferences.time_format || '12'}
                          onValueChange={(value) => handlePreferenceChange('time_format', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                            <SelectItem value="24">24-hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-neutral-700" />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-neutral-200">Default Calendar View</Label>
                        <Select
                          value={preferences.default_view || 'week'}
                          onValueChange={(value) => handlePreferenceChange('default_view', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Show Weekends</Label>
                          <p className="text-sm text-neutral-400">Display Saturday and Sunday in week view</p>
                        </div>
                        <Switch
                          checked={preferences.weekend_visible !== false}
                          onCheckedChange={(checked) => handlePreferenceChange('weekend_visible', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "automation" && (
          <div className="space-y-6">
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">AI Automation</h2>
                      <p className="text-neutral-400 mt-1">Let Timelit work smarter for you</p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Auto-Categorization</Label>
                          <p className="text-sm text-neutral-400">Automatically categorize events and tasks using AI</p>
                        </div>
                        <Switch
                          checked={preferences.auto_categorize_events || false}
                          onCheckedChange={(checked) => handlePreferenceChange('auto_categorize_events', checked)}
                        />
                      </div>

                      <Separator className="bg-neutral-700" />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Auto-schedule Tasks</Label>
                          <p className="text-sm text-neutral-400">Automatically find time slots for tasks</p>
                        </div>
                        <Switch
                          checked={preferences.auto_schedule_tasks_into_calendar || false}
                          onCheckedChange={(checked) => handlePreferenceChange('auto_schedule_tasks_into_calendar', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "notifications" && (
          <div className="space-y-6">
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Notifications</h2>
                      <p className="text-neutral-400 mt-1">Manage how you receive notifications</p>
                    </div>

                    <NotificationPermission />

                    <Separator className="bg-neutral-700" />
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Event Notifications</Label>
                          <p className="text-sm text-neutral-400">Get notified before events start</p>
                        </div>
                        <Switch
                          checked={preferences.notification_for_events || false}
                          onCheckedChange={(checked) => handlePreferenceChange('notification_for_events', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Task Notifications</Label>
                          <p className="text-sm text-neutral-400">Get notified about upcoming tasks</p>
                        </div>
                        <Switch
                          checked={preferences.notification_for_tasks || false}
                          onCheckedChange={(checked) => handlePreferenceChange('notification_for_tasks', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-neutral-200">Default Notification Timing</Label>
                        <Select
                          value={preferences.default_notification_timing || '15min'}
                          onValueChange={(value) => handlePreferenceChange('default_notification_timing', value)}
                        >
                          <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600">
                            <SelectItem value="none">No notification</SelectItem>
                            <SelectItem value="5min">5 minutes before</SelectItem>
                            <SelectItem value="15min">15 minutes before</SelectItem>
                            <SelectItem value="30min">30 minutes before</SelectItem>
                            <SelectItem value="1hour">1 hour before</SelectItem>
                            <SelectItem value="1day">1 day before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "widgets" && (
          <div className="space-y-6">
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Layout className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Sidebar Widgets</h2>
                      <p className="text-neutral-400 mt-1">Choose which widgets to display in the calendar sidebar</p>
                    </div>

                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Target className="w-5 h-5 text-blue-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Today's Focus</Label>
                            <p className="text-xs text-neutral-400">Show your priority tasks for today</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_todays_focus !== false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_todays_focus', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-green-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Free Time</Label>
                            <p className="text-xs text-neutral-400">Show available time slots today</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_free_time !== false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_free_time', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Gauge className="w-5 h-5 text-orange-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Workload</Label>
                            <p className="text-xs text-neutral-400">Show today's workload intensity</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_workload !== false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_workload', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-purple-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Productivity Score</Label>
                            <p className="text-xs text-neutral-400">Track your productivity metrics</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_productivity_score || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_productivity_score', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <BarChart2 className="w-5 h-5 text-pink-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Workload Forecast</Label>
                            <p className="text-xs text-neutral-400">Predict upcoming busy periods</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_workload_forecast || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_workload_forecast', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <ListChecks className="w-5 h-5 text-cyan-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Priorities Summary</Label>
                            <p className="text-xs text-neutral-400">Quick view of high-priority items</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_priorities_summary || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_priorities_summary', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-yellow-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Next Up</Label>
                            <p className="text-xs text-neutral-400">Show your next scheduled event</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_next_up || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_next_up', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Target className="w-5 h-5 text-red-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Streak Tracker</Label>
                            <p className="text-xs text-neutral-400">Track daily completion streaks</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_streak_tracker || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_streak_tracker', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Timer className="w-5 h-5 text-indigo-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Pomodoro Timer</Label>
                            <p className="text-xs text-neutral-400">Built-in focus timer</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_pomodoro || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_pomodoro', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-teal-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Time Budget</Label>
                            <p className="text-xs text-neutral-400">Track time spent vs planned</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_time_budget || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_time_budget', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-700/30">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-rose-400" />
                          <div>
                            <Label className="text-neutral-200 text-base">Mood Tracker</Label>
                            <p className="text-xs text-neutral-400">Log and track your daily mood</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.widget_mood_tracker || false}
                          onCheckedChange={(checked) => handlePreferenceChange('widget_mood_tracker', checked)}
                        />
                      </div>
                    </div>

                    <Separator className="bg-neutral-700" />

                    <div className="space-y-2">
                      <Label className="text-neutral-200">Widget Refresh Rate</Label>
                      <Select
                        value={preferences.widget_refresh_rate || '1min'}
                        onValueChange={(value) => handlePreferenceChange('widget_refresh_rate', value)}
                      >
                        <SelectTrigger className="bg-neutral-700 border-neutral-600 text-neutral-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-700 border-neutral-600">
                          <SelectItem value="30s">30 seconds</SelectItem>
                          <SelectItem value="1min">1 minute</SelectItem>
                          <SelectItem value="5min">5 minutes</SelectItem>
                          <SelectItem value="15min">15 minutes</SelectItem>
                          <SelectItem value="30min">30 minutes</SelectItem>
                          <SelectItem value="1hour">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "advanced" && (
          <div className="space-y-6">
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-neutral-100">Advanced</h2>
                      <p className="text-neutral-400 mt-1">Power user features</p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Prefer Morning Tasks</Label>
                          <p className="text-sm text-neutral-400">Schedule tasks in the morning when possible</p>
                        </div>
                        <Switch
                          checked={preferences.prefer_morning_tasks || false}
                          onCheckedChange={(checked) => handlePreferenceChange('prefer_morning_tasks', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Prefer Afternoon Tasks</Label>
                          <p className="text-sm text-neutral-400">Schedule tasks in the afternoon when possible</p>
                        </div>
                        <Switch
                          checked={preferences.prefer_afternoon_tasks || false}
                          onCheckedChange={(checked) => handlePreferenceChange('prefer_afternoon_tasks', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Enable Weekend Work</Label>
                          <p className="text-sm text-neutral-400">Allow scheduling on weekends</p>
                        </div>
                        <Switch
                          checked={preferences.weekend_work_enabled || false}
                          onCheckedChange={(checked) => handlePreferenceChange('weekend_work_enabled', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-neutral-200 text-base">Enable Long Breaks</Label>
                          <p className="text-sm text-neutral-400">Schedule longer breaks after consecutive tasks</p>
                        </div>
                        <Switch
                          checked={preferences.enable_long_breaks !== false}
                          onCheckedChange={(checked) => handlePreferenceChange('enable_long_breaks', checked)}
                        />
                      </div>

                      <Separator className="bg-neutral-700" />

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-neutral-200">Break Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={preferences.break_duration_between_tasks || 15}
                            onChange={(e) => handlePreferenceChange('break_duration_between_tasks', parseInt(e.target.value))}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>

                        {preferences.enable_long_breaks && (
                          <div className="space-y-2">
                            <Label className="text-neutral-200">Long Break Duration (minutes)</Label>
                            <Input
                              type="number"
                              value={preferences.long_break_duration || 30}
                              onChange={(e) => handlePreferenceChange('long_break_duration', parseInt(e.target.value))}
                              className="bg-neutral-700 border-neutral-600 text-neutral-100"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-neutral-200">Max Consecutive Tasks</Label>
                          <Input
                            type="number"
                            value={preferences.max_consecutive_tasks || 3}
                            onChange={(e) => handlePreferenceChange('max_consecutive_tasks', parseInt(e.target.value))}
                            className="bg-neutral-700 border-neutral-600 text-neutral-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === "account" && (
          <div className="space-y-6">
            <Card className="bg-red-950/20 border-red-900/50">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-red-400">Danger Zone</h2>
                      <p className="text-neutral-400 mt-1">Irreversible actions</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Delete Account</h3>
                        <p className="text-sm text-neutral-400 mb-4">
                          This will permanently delete all your data including tasks, events, preferences, and calendar integrations. This action cannot be undone.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}