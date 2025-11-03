
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Loader2,
  Zap,
  AlertCircle,
  PlayCircle,
  Flame,
  Timer,
  PieChart,
  Smile,
  Play,
  Pause,
  RotateCcw,
  GripVertical
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, addDays, isBefore, startOfToday, subDays, isToday } from "date-fns";
import { useData } from "../providers/DataProvider";
import { timelit } from "@/api/timelitClient";
import { toast } from "sonner";

const getRefreshInterval = (rate) => {
  const intervals = {
    '30s': 30000,
    '1min': 60000,
    '5min': 300000,
    '15min': 900000,
    '30min': 1800000,
    '1hour': 3600000
  };
  return intervals[rate] || 60000;
};

// Pomodoro Widget Component
function PomodoroWidget({ dragHandleProps }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const { user } = useData();

  useEffect(() => {
    const loadTodayData = async () => {
      if (!user) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const sessions = await timelit.entities.PomodoroSession.filter({
        created_by: user.email,
        date: today
      });
      if (sessions.length > 0) {
        setCyclesCompleted(sessions[0].cycles_completed || 0);
      }
    };
    loadTodayData();
  }, [user]);

  const handleCycleComplete = useCallback(async () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
    const newCycles = cyclesCompleted + 1;
    setCyclesCompleted(newCycles);

    if (user) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const sessions = await timelit.entities.PomodoroSession.filter({
        created_by: user.email,
        date: today
      });

      if (sessions.length > 0) {
        await timelit.entities.PomodoroSession.update(sessions[0].id, {
          cycles_completed: newCycles,
          total_focus_time: (sessions[0].total_focus_time || 0) + 25
        });
      } else {
        await timelit.entities.PomodoroSession.create({
          date: today,
          cycles_completed: newCycles,
          total_focus_time: 25,
          created_by: user.email
        });
      }
    }

    toast.success("🍅 Pomodoro completed!");
  }, [cyclesCompleted, user]);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleCycleComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleCycleComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-orange-500/20 rounded-lg flex-shrink-0">
          <Timer className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Pomodoro Timer</div>
          <div className="text-2xl font-mono font-bold text-orange-400 mb-1">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="flex gap-1 mb-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRunning(!isRunning)}
              className="h-6 px-2 text-xs border-neutral-600"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setTimeLeft(25 * 60); setIsRunning(false); }}
              className="h-6 px-2 text-xs border-neutral-600"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-[10px] text-neutral-400">Today: {cyclesCompleted} 🍅</p>
        </div>
      </div>
    </Card>
  );
}

// Mood Tracker Widget
function MoodTrackerWidget({ dragHandleProps }) {
  const [todayMood, setTodayMood] = useState(null);
  const { user } = useData();
  const moods = [
    { value: 1, emoji: '😢', label: 'Awful' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Great' }
  ];

  useEffect(() => {
    const loadTodayMood = async () => {
      if (!user) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const entries = await timelit.entities.MoodEntry.filter({
        created_by: user.email,
        date: today
      });
      if (entries.length > 0) {
        setTodayMood(entries[0].rating);
      }
    };
    loadTodayMood();
  }, [user]);

  const handleMoodSelect = async (rating) => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const entries = await timelit.entities.MoodEntry.filter({
      created_by: user.email,
      date: today
    });

    if (entries.length > 0) {
      await timelit.entities.MoodEntry.update(entries[0].id, { rating });
    } else {
      await timelit.entities.MoodEntry.create({
        date: today,
        rating,
        created_by: user.email
      });
    }

    setTodayMood(rating);
    toast.success("Mood recorded!");
  };

  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-pink-500/20 rounded-lg flex-shrink-0">
          <Smile className="w-3.5 h-3.5 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-1">How are you feeling?</div>
          <div className="flex gap-1 justify-between">
            {moods.map(mood => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                className={`text-lg transition-all ${
                  todayMood === mood.value
                    ? 'scale-125 opacity-100'
                    : 'opacity-50 hover:opacity-75 hover:scale-110'
                }`}
                title={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Widget components
function TodaysFocusWidget({ insights, isLoading, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-blue-500/20 rounded-lg flex-shrink-0">
          <Target className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Today's Focus</div>
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <p className="text-[11px] text-neutral-300 leading-relaxed">{insights?.focus}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function FreeTimeWidget({ insights, isLoading, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-green-500/20 rounded-lg flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Free Time</div>
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <p className="text-[11px] text-neutral-300 leading-relaxed">{insights?.freeTime}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function WorkloadWidget({ insights, isLoading, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-purple-500/20 rounded-lg flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Workload</div>
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <p className="text-[11px] text-neutral-300 leading-relaxed">{insights?.workload}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProductivityScoreWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-yellow-500/20 rounded-lg flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Productivity Score</div>
          <div className="text-2xl font-bold text-yellow-400">{widgetData.productivityScore}%</div>
          <p className="text-[10px] text-neutral-400">Based on today's completed tasks</p>
        </div>
      </div>
    </Card>
  );
}

function WorkloadForecastWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-indigo-500/20 rounded-lg flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">7-Day Forecast</div>
          <p className="text-[11px] text-neutral-300">Avg {widgetData.avgWorkload.toFixed(1)} items/day next week</p>
        </div>
      </div>
    </Card>
  );
}

function PrioritiesSummaryWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-red-500/20 rounded-lg flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">High Priority</div>
          <p className="text-[11px] text-neutral-300">
            {widgetData.highPriorityTasks.length} urgent task{widgetData.highPriorityTasks.length !== 1 ? 's' : ''} pending
          </p>
        </div>
      </div>
    </Card>
  );
}

function NextUpWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-cyan-500/20 rounded-lg flex-shrink-0">
          <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Next Up</div>
          <p className="text-[11px] text-neutral-300 truncate">
            {widgetData.nextUp ? widgetData.nextUp.title : "Nothing scheduled"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function StreakTrackerWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-orange-500/20 rounded-lg flex-shrink-0">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">Streak</div>
          <div className="text-2xl font-bold text-orange-400">{widgetData.streak} 🔥</div>
          <p className="text-[10px] text-neutral-400">days in a row</p>
        </div>
      </div>
    </Card>
  );
}

function TimeBudgetWidget({ widgetData, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-teal-500/20 rounded-lg flex-shrink-0">
          <PieChart className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-1">Time Budget</div>
          <div className="space-y-0.5">
            {Object.entries(widgetData.categoryTime).slice(0, 3).map(([cat, hours]) => (
              <div key={cat} className="flex justify-between text-[10px]">
                <span className="text-neutral-400 capitalize">{cat}</span>
                <span className="text-neutral-300">{hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CustomWidget({ widget, customInsights, loadingWidgets, dragHandleProps }) {
  return (
    <Card className="bg-neutral-800/50 border-neutral-700/50 p-2.5">
      <div className="flex items-start gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-500 hover:text-neutral-300">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 bg-amber-500/20 rounded-lg flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-neutral-200 mb-0.5">{widget.name}</div>
          {loadingWidgets.has(widget.id) ? (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {customInsights[widget.id] || 'Loading...'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function CalendarInsights({ currentDate, calendarView }) {
  const { events, tasks, preferences, isLoading, isUserLoading, updatePreferences } = useData();
  const [insights, setInsights] = useState(null);
  const [customInsights, setCustomInsights] = useState({});
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [loadingWidgets, setLoadingWidgets] = useState(new Set());

  const refreshInterval = getRefreshInterval(preferences?.widget_refresh_rate || '1min');

  const relevantData = useMemo(() => {
    const now = new Date();
    const today = startOfToday();
    const effectiveStartDate = isBefore(startOfDay(currentDate), today) ? today : startOfDay(currentDate);
    const viewStart = effectiveStartDate;
    const viewEnd = calendarView === 'week'
      ? endOfDay(addDays(effectiveStartDate, 6))
      : endOfDay(effectiveStartDate);

    const relevantEvents = events.filter(event => {
      if (!event.start_time) return false;
      try {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        if (isBefore(eventEnd, now)) return false;
        return isWithinInterval(eventStart, { start: viewStart, end: viewEnd });
      } catch {
        return false;
      }
    });

    const relevantTasks = tasks.filter(task => {
      if (task.status === 'done' || task.status === 'wont_do') return false;
      if (!task.due_date) return true;
      try {
        const dueDate = new Date(task.due_date);
        if (isBefore(endOfDay(dueDate), today)) return false;
        return isWithinInterval(dueDate, { start: viewStart, end: viewEnd });
      } catch {
        return false;
      }
    });

    return { events: relevantEvents, tasks: relevantTasks };
  }, [events, tasks, currentDate, calendarView]);

  const widgetData = useMemo(() => {
    const completedTasksToday = tasks.filter(t =>
      t.status === 'done' &&
      t.updated_date &&
      isToday(new Date(t.updated_date))
    ).length;

    const totalTasksToday = tasks.filter(t =>
      t.due_date &&
      isToday(new Date(t.due_date))
    ).length;

    const productivityScore = totalTasksToday > 0
      ? Math.round((completedTasksToday / totalTasksToday) * 100)
      : 0;

    let streak = 0;
    let checkDate = subDays(new Date(), 1);
    for (let i = 0; i < 365; i++) {
      const dayTasks = tasks.filter(t =>
        t.status === 'done' &&
        t.updated_date &&
        isToday(new Date(t.updated_date), { referenceDate: checkDate })
      );
      if (dayTasks.length > 0) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    const todayCompletedTasks = tasks.filter(t =>
      t.status === 'done' &&
      t.updated_date &&
      isToday(new Date(t.updated_date))
    ).length;
    if (todayCompletedTasks > 0) {
      streak++;
    }

    const upcomingEvents = events
      .filter(e => new Date(e.start_time) > new Date())
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const upcomingTasks = tasks
      .filter(t => t.status === 'todo' && t.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const nextUp = upcomingEvents[0] || upcomingTasks[0];

    const highPriorityTasks = tasks.filter(t =>
      (t.priority === 'high' || t.priority === 'urgent') &&
      t.status !== 'done'
    );

    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(new Date(), i);
      const dayEvents = events.filter(e =>
        isToday(new Date(e.start_time), { referenceDate: day })
      );
      const dayTasks = tasks.filter(t =>
        t.due_date && isToday(new Date(t.due_date), { referenceDate: day })
      );
      return dayEvents.length + dayTasks.length;
    });

    const avgWorkload = next7Days.reduce((a, b) => a + b, 0) / 7;

    const categoryTime = {};
    events.forEach(e => {
      const category = e.category || 'uncategorized';
      try {
        const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
        if (!isNaN(duration) && duration > 0) {
          categoryTime[category] = (categoryTime[category] || 0) + duration;
        }
      } catch (error) {
        console.error("Error calculating event duration:", error);
      }
    });

    return {
      productivityScore,
      streak,
      nextUp,
      highPriorityTasks,
      avgWorkload,
      categoryTime
    };
  }, [tasks, events]);

  const generateFallbackInsights = useCallback(() => {
    const eventCount = relevantData.events.length;
    const taskCount = relevantData.tasks.length;

    return {
      focus: taskCount > 0
        ? `Focus on ${taskCount} task${taskCount > 1 ? 's' : ''} and ${eventCount} event${eventCount !== 1 ? 's' : ''}`
        : eventCount > 0
          ? `${eventCount} event${eventCount !== 1 ? 's' : ''} scheduled today`
          : "No events or tasks scheduled. Perfect day to plan ahead!",
      freeTime: eventCount === 0
        ? "Your entire day is free"
        : eventCount < 3
          ? "Plenty of free time available"
          : "Limited free time between events",
      workload: eventCount === 0 && taskCount === 0
        ? "Light workload today"
        : eventCount > 5 || taskCount > 10
          ? "Busy day ahead - stay focused!"
          : "Moderate workload expected"
    };
  }, [relevantData]);

  useEffect(() => {
    const generateInsights = async () => {
      // Always start with fallback insights
      const fallback = generateFallbackInsights();
      setInsights(fallback);

      if (relevantData.events.length === 0 && relevantData.tasks.length === 0) {
        return;
      }

      setIsLLMLoading(true);
      try {
        const prompt = `You are a calendar assistant. Analyze this schedule and provide THREE brief insights:

1. **Today's Focus** (max 15 words): Summarize key meetings, tasks due, and suggest focus areas
2. **Free Time** (max 10 words): Identify the largest continuous free time block
3. **Predicted Workload** (max 12 words): Assess how busy this day/week is

Current date: ${format(currentDate, 'EEEE, MMMM d, yyyy')}
View: ${calendarView}

Events:
${relevantData.events.slice(0, 5).map(e => {
  try {
    return `- ${e.title} (${format(new Date(e.start_time), 'h:mm a')} - ${format(new Date(e.end_time), 'h:mm a')})`;
  } catch {
    return `- ${e.title}`;
  }
}).join('\n') || 'No events scheduled'}

Tasks Due:
${relevantData.tasks.slice(0, 5).map(t => {
  try {
    return `- ${t.title} ${t.due_date ? `(due ${format(new Date(t.due_date), 'MMM d')})` : ''} [Priority: ${t.priority || 'medium'}]`;
  } catch {
    return `- ${t.title} [Priority: ${t.priority || 'medium'}]`;
  }
}).join('\n') || 'No tasks due'}

Return ONLY a JSON object with keys: focus, freeTime, workload. Keep responses concise and actionable.`;

        const response = await Promise.race([
          timelit.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                focus: { type: "string" },
                freeTime: { type: "string" },
                workload: { type: "string" }
              },
              required: ["focus", "freeTime", "workload"]
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
          )
        ]);

        if (response && typeof response === 'object' && response.focus && response.freeTime && response.workload) {
          setInsights(response);
        } else {
          console.warn("Invalid AI response for main insights, using fallback");
          setInsights(fallback);
        }
      } catch (error) {
        console.warn("Failed to generate AI insights, using fallback:", error.message);
        setInsights(fallback);
      } finally {
        setIsLLMLoading(false);
      }
    };

    generateInsights();
    const interval = setInterval(generateInsights, refreshInterval);
    return () => clearInterval(interval);
  }, [relevantData, currentDate, calendarView, refreshInterval, generateFallbackInsights]);

  useEffect(() => {
    const customWidgets = preferences?.custom_widgets || [];
    const enabledWidgets = customWidgets.filter(w => w.enabled);

    if (enabledWidgets.length === 0) {
      setCustomInsights({});
      setLoadingWidgets(new Set());
      return;
    }

    const generateCustomInsight = async (widget) => {
      setLoadingWidgets(prev => new Set(prev).add(widget.id));

      // Start with a simple fallback
      const eventCount = relevantData.events.length;
      const taskCount = relevantData.tasks.length;
      const simpleFallback = `${eventCount} events and ${taskCount} tasks scheduled`;

      try {
        const eventSummary = relevantData.events.slice(0, 5).map(e => {
          try {
            return `- ${e.title} (${format(new Date(e.start_time), 'MMM d, h:mm a')})`;
          } catch {
            return `- ${e.title}`;
          }
        }).join('\n') || 'No upcoming events';

        const taskSummary = relevantData.tasks.slice(0, 5).map(t => {
          try {
            return `- ${t.title}${t.due_date ? ` (due ${format(new Date(t.due_date), 'MMM d')})` : ''} [${t.priority || 'medium'} priority]`;
          } catch {
            return `- ${t.title} [${t.priority || 'medium'} priority]`;
          }
        }).join('\n') || 'No pending tasks';

        const prompt = `You are a personalized calendar insight assistant. The user has requested: "${widget.prompt}"

Current Date: ${format(currentDate, 'EEEE, MMMM d, yyyy')}

Upcoming Events (next 7 days):
${eventSummary}

Pending Tasks:
${taskSummary}

Generate a concise, actionable insight (max 20 words) that directly addresses the user's request. Use actual data from their schedule.

Return a JSON object with a single key "insight" containing your response.`;

        const response = await Promise.race([
          timelit.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
              type: "object",
              properties: {
                insight: { type: "string" }
              },
              required: ["insight"]
            },
            add_context_from_internet: false
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
          )
        ]);

        if (response?.insight) {
          setCustomInsights(prev => ({ ...prev, [widget.id]: response.insight }));
        } else {
          console.warn(`Invalid AI response for custom widget "${widget.name}", using fallback.`);
          setCustomInsights(prev => ({ ...prev, [widget.id]: simpleFallback }));
        }
      } catch (error) {
        console.warn(`Failed to generate custom insight for ${widget.name}, using fallback:`, error.message);
        setCustomInsights(prev => ({ ...prev, [widget.id]: simpleFallback }));
      } finally {
        setLoadingWidgets(prev => {
          const newSet = new Set(prev);
          newSet.delete(widget.id);
          return newSet;
        });
      }
    };

    enabledWidgets.forEach(widget => generateCustomInsight(widget));

    const interval = setInterval(() => {
      enabledWidgets.forEach(widget => generateCustomInsight(widget));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [preferences?.custom_widgets, relevantData, currentDate, refreshInterval]);

  // Early return AFTER all hooks
  if (isLoading || isUserLoading || !preferences) {
    return (
      <div className="space-y-3 p-2">
        <div className="h-24 rounded-lg bg-neutral-800 animate-pulse" />
        <div className="h-24 rounded-lg bg-neutral-800 animate-pulse" />
        <div className="h-24 rounded-lg bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  const allWidgets = [
    {
      id: 'widget_todays_focus',
      type: 'builtin',
      component: TodaysFocusWidget,
      enabled: preferences.widget_todays_focus !== false,
      props: { insights, isLoading: isLLMLoading }
    },
    {
      id: 'widget_free_time',
      type: 'builtin',
      component: FreeTimeWidget,
      enabled: preferences.widget_free_time !== false,
      props: { insights, isLoading: isLLMLoading }
    },
    {
      id: 'widget_workload',
      type: 'builtin',
      component: WorkloadWidget,
      enabled: preferences.widget_workload !== false,
      props: { insights, isLoading: isLLMLoading }
    },
    {
      id: 'widget_productivity_score',
      type: 'builtin',
      component: ProductivityScoreWidget,
      enabled: preferences.widget_productivity_score === true,
      props: { widgetData }
    },
    {
      id: 'widget_workload_forecast',
      type: 'builtin',
      component: WorkloadForecastWidget,
      enabled: preferences.widget_workload_forecast === true,
      props: { widgetData }
    },
    {
      id: 'widget_priorities_summary',
      type: 'builtin',
      component: PrioritiesSummaryWidget,
      enabled: preferences.widget_priorities_summary === true,
      props: { widgetData }
    },
    {
      id: 'widget_next_up',
      type: 'builtin',
      component: NextUpWidget,
      enabled: preferences.widget_next_up === true,
      props: { widgetData }
    },
    {
      id: 'widget_streak_tracker',
      type: 'builtin',
      component: StreakTrackerWidget,
      enabled: preferences.widget_streak_tracker === true,
      props: { widgetData }
    },
    {
      id: 'widget_pomodoro',
      type: 'builtin',
      component: PomodoroWidget,
      enabled: preferences.widget_pomodoro === true,
      props: {}
    },
    {
      id: 'widget_time_budget',
      type: 'builtin',
      component: TimeBudgetWidget,
      enabled: preferences.widget_time_budget === true,
      props: { widgetData }
    },
    {
      id: 'widget_mood_tracker',
      type: 'builtin',
      component: MoodTrackerWidget,
      enabled: preferences.widget_mood_tracker === true,
      props: {}
    },
    // Add custom widgets
    ...(preferences.custom_widgets || []).map(widget => ({
      id: widget.id,
      type: 'custom',
      component: CustomWidget,
      enabled: widget.enabled === true,
      props: { widget, customInsights, loadingWidgets },
      widgetData: widget
    }))
  ];

  // Filter enabled widgets
  const enabledWidgets = allWidgets.filter(w => w.enabled);

  // Apply saved order
  const widgetOrder = preferences.widget_order || [];
  const orderedWidgets = [...enabledWidgets].sort((a, b) => {
    const aIndex = widgetOrder.indexOf(a.id);
    const bIndex = widgetOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0; // Both not in order, maintain relative
    if (aIndex === -1) return 1; // 'a' not in order, comes after 'b'
    if (bIndex === -1) return -1; // 'b' not in order, comes after 'a'
    return aIndex - bIndex; // Sort by their index in the order array
  });

  const handleDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    // Create a mutable copy of the current ordered widgets to reorder locally
    const items = Array.from(orderedWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Extract new order of IDs
    const newOrder = items.map(item => item.id);

    // Update preferences with new order
    try {
      await updatePreferences({ widget_order: newOrder });
      toast.success("Widget order saved", { duration: 1000 });
    } catch (error) {
      console.error("Failed to save widget order:", error);
      toast.error("Failed to save widget order");
    }
  };

  if (orderedWidgets.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        No widgets enabled. Enable them in Settings → Widgets.
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="widgets">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {orderedWidgets.map((widget, index) => {
              const Component = widget.component;
              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <Component
                        {...widget.props}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
