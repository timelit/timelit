
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart2,
  Calendar,
  TrendingUp,
  Target,
  Zap,
  CheckCircle,
  PieChart as PieIcon,
  Clock,
  Award,
  Activity,
  Sparkles,
  Filter,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  startOfDay,
  eachDayOfInterval,
  isSameDay,
  isValid
} from 'date-fns';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { useData } from '../components/providers/DataProvider';
import { timelit } from '@/api/timelitClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6'];

const StatisticsPage = () => {
  const { user, events, tasks, isLoading, error, preferences } = useData();
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const calculateStats = useCallback(() => {
    if (!user || !events || !tasks) {
      return;
    }

    try {
      const now = new Date();
      let rangeStart, rangeEnd, previousRangeStart, previousRangeEnd;

      switch (timeRange) {
        case 'week':
          rangeStart = startOfWeek(now, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
          previousRangeStart = startOfWeek(subMonths(now, 0.25), { weekStartsOn: 1 }); // Approx 1 week ago
          previousRangeEnd = endOfWeek(subMonths(now, 0.25), { weekStartsOn: 1 }); // Approx 1 week ago
          break;
        case 'month':
          rangeStart = startOfMonth(now);
          rangeEnd = endOfMonth(now);
          previousRangeStart = startOfMonth(subMonths(now, 1));
          previousRangeEnd = endOfMonth(subMonths(now, 1));
          break;
        case 'quarter':
          rangeStart = startOfMonth(subMonths(now, 2)); // Start 3 months ago
          rangeEnd = endOfMonth(now);
          previousRangeStart = startOfMonth(subMonths(now, 5)); // Start 6 months ago
          previousRangeEnd = endOfMonth(subMonths(now, 3)); // End 3 months ago
          break;
        case 'year':
          rangeStart = startOfMonth(subMonths(now, 11)); // Start 12 months ago
          rangeEnd = endOfMonth(now);
          previousRangeStart = startOfMonth(subMonths(now, 23)); // Start 24 months ago
          previousRangeEnd = endOfMonth(subMonths(now, 12)); // End 12 months ago
          break;
        default:
          rangeStart = startOfWeek(now, { weekStartsOn: 1 });
          rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
      }

      // Safe date parsing helper
      const safeParse = (dateString) => {
        try {
          const parsed = parseISO(dateString);
          return isValid(parsed) ? parsed : null;
        } catch {
          return null;
        }
      };

      // Filter events for current period
      const currentEvents = events.filter(event => {
        if (!event.start_time) return false;
        const eventStart = safeParse(event.start_time);
        if (!eventStart) return false;
        return isWithinInterval(eventStart, { start: rangeStart, end: rangeEnd });
      });

      // Filter events for previous period
      const previousEvents = events.filter(event => {
        if (!event.start_time) return false;
        const eventStart = safeParse(event.start_time);
        if (!eventStart) return false;
        return isWithinInterval(eventStart, { start: previousRangeStart, end: previousRangeEnd });
      });

      // Filter tasks created in current range
      const currentTasks = tasks.filter(t => {
        if (!t.created_date) return false;
        const createdDate = safeParse(t.created_date);
        if (!createdDate) return false;
        return isWithinInterval(createdDate, { start: rangeStart, end: rangeEnd });
      });

      // Calculate time spent by category
      const categoryTime = {};
      const eventCategories = preferences?.event_categories || [
        {name: "work", color: "#3b82f6"},
        {name: "personal", color: "#8b5cf6"},
        {name: "meeting", color: "#ec4899"},
        {name: "appointment", color: "#10b981"},
        {name: "reminder", color: "#f59e0b"},
        {name: "travel", color: "#6366f1"},
        {name: "social", color: "#ef4444"}
      ];

      currentEvents.forEach(event => {
        if (!event.start_time || !event.end_time || !event.category) return;

        const start = safeParse(event.start_time);
        const end = safeParse(event.end_time);

        if (!start || !end) return;

        const minutes = differenceInMinutes(end, start);
        if (isNaN(minutes) || minutes <= 0) return;

        categoryTime[event.category] = (categoryTime[event.category] || 0) + minutes;
      });

      const categoryData = Object.entries(categoryTime)
        .map(([name, minutes]) => {
          const category = eventCategories.find(c => c.name === name);
          return {
            name,
            hours: parseFloat((minutes / 60).toFixed(1)),
            color: category?.color || '#8b5cf6'
          };
        })
        .sort((a, b) => b.hours - a.hours);

      // Task metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      
      const tasksCreatedInRange = currentTasks.length;

      // Only count tasks completed in the current range that were also created in the current range
      const tasksCompletedInRange = currentTasks.filter(t => t.status === 'done').length;

      // Ensure completion rate never exceeds 100%
      const rangeCompletionRate = tasksCreatedInRange > 0 ?
        Math.min(100, parseFloat(((tasksCompletedInRange / tasksCreatedInRange) * 100).toFixed(1))) : 0;

      // Priority task completion (new metric)
      const priorityTasks = currentTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
      const priorityTasksCompleted = priorityTasks.filter(t => t.status === 'done').length;
      const priorityCompletionRate = priorityTasks.length > 0 ?
        parseFloat(((priorityTasksCompleted / priorityTasks.length) * 100).toFixed(1)) : 100; // If no priority tasks, assume 100% completion

      // On-time completion (tasks completed before or on due date) (new metric)
      const tasksWithDueDate = currentTasks.filter(t => t.due_date && t.status === 'done');
      const tasksCompletedOnTime = tasksWithDueDate.filter(t => {
        if (!t.updated_date || !t.due_date) return false;
        const completedDate = safeParse(t.updated_date);
        const dueDate = safeParse(t.due_date);
        if (!completedDate || !dueDate) return false;
        return completedDate <= dueDate;
      }).length;

      // Fixed logic: If there are no tasks with due dates that were completed, don't assume 100%
      const onTimeRate = tasksWithDueDate.length > 0 ?
        parseFloat(((tasksCompletedOnTime / tasksWithDueDate.length) * 100).toFixed(1)) : 0;

      // Priority distribution - only for tasks in current range
      const priorityCount = currentTasks.reduce((acc, task) => {
        const priority = task.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      // Map priorities to their colors
      const priorityColors = {
        low: '#3b82f6', // blue
        medium: '#eab308', // yellow
        high: '#f97316', // orange
        urgent: '#ef4444' // red
      };

      const priorityData = Object.entries(priorityCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: priorityColors[name] || '#8b5cf6' // Default if color not found
      }));

      // AI Scheduling metrics
      // These should ideally be for currentTasks as well for better relevance
      const aiScheduledTasks = currentTasks.filter(t => t.auto_scheduled).length;
      const aiScheduledEvents = currentEvents.filter(e => e.ai_suggested).length;

      // Calculate total scheduled time
      const totalScheduledMinutes = currentEvents.reduce((total, event) => {
        if (!event.start_time || !event.end_time) return total;

        const start = safeParse(event.start_time);
        const end = safeParse(event.end_time);

        if (!start || !end) return total;

        const diff = differenceInMinutes(end, start);
        return total + (isNaN(diff) || diff < 0 ? 0 : diff);
      }, 0);

      const daysInRange = Math.max(1, Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)));
      const avgHoursPerDay = parseFloat((totalScheduledMinutes / 60 / daysInRange).toFixed(1));

      // Previous period comparison
      const previousTotalMinutes = previousEvents.reduce((total, event) => {
        if (!event.start_time || !event.end_time) return total;

        const start = safeParse(event.start_time);
        const end = safeParse(event.end_time);

        if (!start || !end) return total;

        const diff = differenceInMinutes(end, start);
        return total + (isNaN(diff) || diff < 0 ? 0 : diff);
      }, 0);

      const previousDaysInRange = Math.max(1, Math.ceil((previousRangeEnd - previousRangeStart) / (1000 * 60 * 60 * 24)));
      const previousAvgHoursPerDay = parseFloat((previousTotalMinutes / 60 / previousDaysInRange).toFixed(1));

      const workloadChange = previousAvgHoursPerDay > 0
        ? parseFloat(((avgHoursPerDay - previousAvgHoursPerDay) / previousAvgHoursPerDay * 100).toFixed(1))
        : 0;

      // Daily activity heatmap
      const dailyActivity = [];
      const daysArray = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

      daysArray.forEach(day => {
        const dayEvents = currentEvents.filter(e => {
          if (!e.start_time) return false;
          const eventStart = safeParse(e.start_time);
          return eventStart && isSameDay(eventStart, day);
        });

        const dayMinutes = dayEvents.reduce((total, event) => {
          if (!event.start_time || !event.end_time) return total;

          const start = safeParse(event.start_time);
          const end = safeParse(event.end_time);

          if (!start || !end) return total;

          const diff = differenceInMinutes(end, start);
          return total + (isNaN(diff) || diff < 0 ? 0 : diff);
        }, 0);

        dailyActivity.push({
          date: format(day, 'MMM d'),
          hours: parseFloat((dayMinutes / 60).toFixed(1)),
          events: dayEvents.length
        });
      });

      // Time of day distribution
      const hourDistribution = new Array(24).fill(0);
      currentEvents.forEach(event => {
        if (!event.start_time) return;
        const eventStart = safeParse(event.start_time);
        if (eventStart) {
          const hour = eventStart.getHours();
          hourDistribution[hour]++;
        }
      });

      const maxHourValue = Math.max(...hourDistribution);
      const peakHour = maxHourValue > 0 ? hourDistribution.indexOf(maxHourValue) : 9;

      // NEW Productivity score calculation - using only tasks created in range
      const completionWeight = 0.50;  // 50% - General task completion
      const priorityWeight = 0.30;     // 30% - High/Urgent priority task completion
      const onTimeWeight = 0.20;       // 20% - On-time completion of tasks with due dates

      const completionScore = rangeCompletionRate;
      const priorityScore = priorityCompletionRate;
      const onTimeScore = onTimeRate;

      const productivityScore = Math.min(100, Math.max(0, Math.round(
        (completionScore * completionWeight) +
        (priorityScore * priorityWeight) +
        (onTimeScore * onTimeWeight)
      )));

      setStats({
        totalEvents: currentEvents.length,
        totalScheduledHours: parseFloat((totalScheduledMinutes / 60).toFixed(1)),
        completionRate: rangeCompletionRate, // Use rangeCompletionRate for this period
        categoryData,
        priorityData,
        aiScheduledTasks, // Adjusted to current range
        aiScheduledEvents, // Adjusted to current range
        avgHoursPerDay,
        workloadChange,
        dailyActivity,
        peakHour,
        productivityScore,
        tasksCreatedInRange,
        tasksCompletedInRange,
        totalTasks, // All tasks in DB
        completedTasks, // All completed tasks in DB
        priorityCompletionRate, // New metric
        onTimeRate, // New metric
        priorityTasksCount: priorityTasks.length, // Supporting data for new metric
        priorityTasksCompleted, // Supporting data for new metric
        tasksCompletedOnTime, // Supporting data for new metric
        tasksWithDueDateCount: tasksWithDueDate.length // Supporting data for new metric
      });

    } catch (error) {
      console.error("Failed to calculate statistics:", error);
      toast.error("Error calculating statistics");
    }
  }, [user, events, tasks, timeRange, preferences]);

  const generateAIInsights = useCallback(async () => {
    if (!stats) return; // Stats must be available to generate insights

    setIsLoadingInsights(true);
    try {
      const categoryBreakdown = stats.categoryData.slice(0, 3).map(c => `${c.name}: ${c.hours}h`).join(', ');

      const prompt = `Analyze this productivity data and provide 4 brief, actionable insights (max 15 words each):

Period: ${timeRange}
- Total Events: ${stats.totalEvents}
- Hours Scheduled: ${stats.totalScheduledHours}
- Tasks Created: ${stats.tasksCreatedInRange}
- Tasks Completed: ${stats.tasksCompletedInRange}
- Completion Rate: ${stats.completionRate}%
- Priority Completion Rate: ${stats.priorityCompletionRate}%
- On-Time Completion Rate: ${stats.onTimeRate}%
- Productivity Score: ${stats.productivityScore}/100
- AI Scheduled Tasks: ${stats.aiScheduledTasks}
- Avg Hours/Day: ${stats.avgHoursPerDay}
- Workload Change: ${stats.workloadChange}%
- Peak Activity: ${stats.peakHour}:00
- Top Categories: ${categoryBreakdown}

Provide concise insights on: 1) Overall productivity, 2) Time allocation, 3) Task management, 4) Actionable recommendation`;

      const response = await timelit.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 4
            }
          },
          required: ["insights"]
        }
      });

      if (response?.insights && Array.isArray(response.insights)) {
        setAiInsights(response.insights);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to generate AI insights:", error);
      // Fallback insights if AI fails or returns invalid format
      if (stats) {
        setAiInsights([
          `You completed ${stats.completionRate}% of tasks this ${timeRange}`,
          `Most active at ${stats.peakHour}:00 - schedule important work then`,
          `${stats.aiScheduledTasks} tasks auto-scheduled, saving time`,
          "Keep up the momentum - consistency drives results"
        ]);
      } else {
         setAiInsights(["Could not generate AI insights.", "Data needed for insights missing."]);
      }
    } finally {
      setIsLoadingInsights(false);
    }
  }, [stats, timeRange, setAiInsights, setIsLoadingInsights]);

  useEffect(() => {
    if (!isLoading && user && events && tasks) {
      calculateStats();
    }
  }, [isLoading, user, events, tasks, timeRange, calculateStats]);

  // Generate insights only when stats are available and insights haven't been loaded yet
  // or if insights were cleared by a timeRange change
  useEffect(() => {
    if (stats && !aiInsights && !isLoadingInsights) {
      generateAIInsights();
    }
  }, [stats, aiInsights, isLoadingInsights, generateAIInsights]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    setAiInsights(null); // Clear insights to trigger regeneration for the new time range
  };

  const [currentTab, setCurrentTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <span className="text-lg font-medium text-neutral-200">Loading analytics...</span>
        </div>
      </div>
    );
  }
  
  if (error || !stats) {
    return (
      <div className="p-6 flex items-center justify-center h-full bg-neutral-900">
        <div className="text-center">
          <p className="text-lg font-medium text-red-400 mb-2">Error loading statistics</p>
          <p className="text-sm text-neutral-400">{error?.message || 'Please try refreshing the page'}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-4 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  const getChangeIndicator = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return { icon: Minus, color: 'text-neutral-400', text: 'No change' };
    if (num > 0) return { icon: ArrowUp, color: 'text-green-500', text: `+${num}%` };
    return { icon: ArrowDown, color: 'text-red-500', text: `${num}%` };
  };

  const workloadIndicator = getChangeIndicator(stats.workloadChange);

  const tooltipStyle = {
    backgroundColor: '#262626',
    border: '1px solid #404040',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '8px 12px'
  };

  const getTabLabel = (tab) => {
    switch(tab) {
      case 'overview': return 'Overview';
      case 'categories': return 'Categories';
      case 'tasks': return 'Tasks';
      case 'trends': return 'Trends';
      default: return 'Overview';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-neutral-900">
      <div className="sticky top-0 z-10 bg-neutral-900 px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
              <BarChart2 className="w-7 h-7"/>
              Statistics
            </h1>
            <p className="text-neutral-400 mt-1">Insights into your productivity and schedule</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={currentTab} onValueChange={setCurrentTab}>
              <SelectTrigger className="w-36 bg-transparent border-0 text-neutral-100">
                <SelectValue placeholder="Select Tab" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="overview" className="text-neutral-100">Overview</SelectItem>
                <SelectItem value="categories" className="text-neutral-100">Categories</SelectItem>
                <SelectItem value="tasks" className="text-neutral-100">Tasks</SelectItem>
                <SelectItem value="trends" className="text-neutral-100">Trends</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-36 bg-transparent border-0 text-neutral-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="week" className="text-neutral-100">Week</SelectItem>
                <SelectItem value="month" className="text-neutral-100">Month</SelectItem>
                <SelectItem value="quarter" className="text-neutral-100">Quarter</SelectItem>
                <SelectItem value="year" className="text-neutral-100">Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateAIInsights}
              disabled={isLoadingInsights || !stats}
              variant="outline"
              className="bg-transparent border-0 text-neutral-100 hover:bg-neutral-800"
            >
              {isLoadingInsights ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Insights
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Tab Content - Conditionally rendered */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            {/* Productivity Score Card - MOVED TO TOP OF OVERVIEW TAB */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90 mb-2">Productivity Score</p>
                      <h2 className="text-6xl font-bold">{stats.productivityScore}</h2>
                    </div>
                    <div className="text-right">
                      <Award className="w-20 h-20 opacity-30 mb-4" />
                      <Badge className="bg-white/20 text-white border-white/30">
                        {stats.productivityScore >= 80 ? 'Excellent' :
                         stats.productivityScore >= 60 ? 'Good' :
                         stats.productivityScore >= 40 ? 'Fair' : 'Needs Work'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Insights Banner */}
            {aiInsights && aiInsights.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-3">AI-Powered Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiInsights.map((insight, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white/10 rounded-lg p-3">
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                                {idx + 1}
                              </div>
                              <p className="text-sm leading-relaxed">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <workloadIndicator.icon className={`w-4 h-4 ${workloadIndicator.color}`} />
                        <span className={workloadIndicator.color}>{workloadIndicator.text}</span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-400 mb-1">Avg Hours/Day</p>
                    <p className="text-4xl font-bold text-neutral-100">{stats.avgHoursPerDay}h</p>
                    <p className="text-xs text-neutral-500 mt-1">scheduled time</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm text-neutral-400 mb-1">Completion Rate</p>
                    <p className="text-4xl font-bold text-neutral-100">{stats.completionRate}%</p>
                    <p className="text-xs text-neutral-500 mt-1">{stats.tasksCompletedInRange}/{stats.tasksCreatedInRange} tasks</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm text-neutral-400 mb-1">AI Scheduled</p>
                    <p className="text-4xl font-bold text-neutral-100">{stats.aiScheduledTasks}</p>
                    <p className="text-xs text-neutral-500 mt-1">tasks auto-scheduled</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-sm text-neutral-400 mb-1">Peak Activity</p>
                    <p className="text-4xl font-bold text-neutral-100">{stats.peakHour}:00</p>
                    <p className="text-xs text-neutral-500 mt-1">most active hour</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Daily Activity Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-lg border-0 bg-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-neutral-100">
                    <Activity className="w-5 h-5" />
                    Daily Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.dailyActivity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={stats.dailyActivity}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          stroke="#737373"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#737373"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{ color: '#e5e5e5' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorHours)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-neutral-400">
                      No activity data for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Categories Tab Content - Conditionally rendered */}
        {currentTab === 'categories' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-neutral-100">
                      <PieIcon className="w-5 h-5" />
                      Time by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={stats.categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="hours"
                          >
                            {stats.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-neutral-400">
                        No category data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-neutral-100">
                      <BarChart2 className="w-5 h-5" />
                      Hours by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.categoryData}>
                          <XAxis
                            dataKey="name"
                            stroke="#737373"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            stroke="#737373"
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                            {stats.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-neutral-400">
                        No category data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {/* Tasks Tab Content - Conditionally rendered */}
        {currentTab === 'tasks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-neutral-100">
                      <Target className="w-5 h-5" />
                      Task Priorities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.priorityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={stats.priorityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.priorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-neutral-400">
                        No priority data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="shadow-lg border-0 bg-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-neutral-100">
                      <CheckCircle className="w-5 h-5" />
                      Task Completion Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-neutral-400">Overall Completion</span>
                          <span className="text-lg font-bold text-neutral-100">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {stats.tasksCompletedInRange} of {stats.tasksCreatedInRange} tasks completed
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-neutral-400">Priority Tasks</span>
                          <span className="text-lg font-bold text-neutral-100">{stats.priorityCompletionRate}%</span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${stats.priorityCompletionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {stats.priorityTasksCompleted} of {stats.priorityTasksCount} high-priority tasks done
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-neutral-400">On-Time Completion</span>
                          <span className="text-lg font-bold text-neutral-100">{stats.onTimeRate}%</span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${stats.onTimeRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {stats.tasksCompletedOnTime} of {stats.tasksWithDueDateCount} tasks finished on time
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {/* Trends Tab Content - Conditionally rendered */}
        {currentTab === 'trends' && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-lg border-0 bg-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-neutral-100">
                    <TrendingUp className="w-5 h-5" />
                    Productivity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-neutral-700/50 rounded-lg">
                      <p className="text-sm text-neutral-400 mb-1">Workload Change</p>
                      <p className="text-3xl font-bold text-neutral-100">
                        <span className={workloadIndicator.color}>{workloadIndicator.text}</span>
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">vs previous period</p>
                    </div>
                    <div className="text-center p-4 bg-neutral-700/50 rounded-lg">
                      <p className="text-sm text-neutral-400 mb-1">Total Events</p>
                      <p className="text-3xl font-bold text-neutral-100">{stats.totalEvents}</p>
                      <p className="text-xs text-neutral-500 mt-1">scheduled this period</p>
                    </div>
                    <div className="text-center p-4 bg-neutral-700/50 rounded-lg">
                      <p className="text-sm text-neutral-400 mb-1">Total Hours</p>
                      <p className="text-3xl font-bold text-neutral-100">{stats.totalScheduledHours}h</p>
                      <p className="text-xs text-neutral-500 mt-1">time scheduled</p>
                    </div>
                  </div>

                  {stats.dailyActivity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.dailyActivity}>
                        <XAxis
                          dataKey="date"
                          stroke="#737373"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#737373"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="events"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-neutral-400">
                      No trend data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
