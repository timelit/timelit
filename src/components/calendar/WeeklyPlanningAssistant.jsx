import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Sparkles, Clock, ListTodo, CheckCircle, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Event } from "@/api/entities";
import { Task } from "@/api/entities";
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

export default function WeeklyPlanningAssistant({ onSuggestEvent }) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [currentTasks, setCurrentTasks] = useState([]);
  const [currentEvents, setCurrentEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        const prefs = await UserPreferences.filter({ created_by: userData.email });
        if (prefs.length > 0) {
          setPreferences(prefs[0]);
        }

        // Load current tasks and events
        const [tasks, events] = await Promise.all([
          Task.filter({ created_by: userData.email }, "-created_date", 50),
          Event.filter({ created_by: userData.email }, "-start_time", 50)
        ]);
        
        setCurrentTasks(tasks);
        setCurrentEvents(events);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, []);

  const generateWeeklyPlan = async () => {
    if (!user) return;

    setIsLoading(true);
    setSuggestions(null);

    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      // Prepare current tasks context
      const incompleteTasks = currentTasks.filter(task => task.status !== 'done');
      const tasksContext = incompleteTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        status: task.status
      }));

      // Prepare current events context
      const eventsThisWeek = currentEvents.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });

      const eventsContext = eventsThisWeek.map(event => ({
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        category: event.category
      }));

      const workHours = preferences?.work_start_time || "09:00";
      const workEnd = preferences?.work_end_time || "17:00";

      // Mock response since LLM API is not implemented
      const mockResponse = {
        weekly_summary: "Weekly planning feature is currently disabled. LLM API integration needed for full functionality.",
        updates: [],
        new_items: []
      };
      const response = mockResponse;

      setSuggestions(response);
    } catch (error) {
      console.error("Error generating weekly plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPlan = () => {
    if (suggestions) {
      onSuggestEvent(suggestions);
      setSuggestions(null);
    }
  };

  const handleAcceptUpdate = (update) => {
    onSuggestEvent({ updates: [update], new_items: [] });
    setSuggestions(prev => ({
      ...prev,
      updates: prev.updates.filter(u => u.id !== update.id)
    }));
  };

  const handleAcceptNewItem = (item) => {
    onSuggestEvent({ updates: [], new_items: [item] });
    setSuggestions(prev => ({
      ...prev,
      new_items: prev.new_items.filter(i => i !== item)
    }));
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          Weekly Planning Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-3">
            Get an optimized weekly schedule that integrates your existing tasks with new suggestions for better productivity.
          </p>
          
          {/* Current Tasks Preview */}
          {currentTasks.length > 0 && (
            <div className="mb-4 p-3 bg-background/60 rounded-lg border border-border/60">
              <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
                <ListTodo className="w-4 h-4" />
                Your Current Tasks ({currentTasks.filter(t => t.status !== 'done').length} pending)
              </h4>
              <div className="space-y-1">
                {currentTasks.filter(t => t.status !== 'done').slice(0, 3).map(task => (
                  <div key={task.id} className="text-xs flex items-center gap-2">
                    <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                      {task.priority}
                    </Badge>
                    <span className="truncate">{task.title}</span>
                    {task.due_date && (
                      <span className="text-muted-foreground">({format(new Date(task.due_date), 'MMM d')})</span>
                    )}
                  </div>
                ))}
                {currentTasks.filter(t => t.status !== 'done').length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{currentTasks.filter(t => t.status !== 'done').length - 3} more tasks
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={generateWeeklyPlan}
          disabled={isLoading || !user}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Creating Your Weekly Plan...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Integrated Weekly Plan
            </>
          )}
        </Button>

        <AnimatePresence>
          {suggestions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="p-4 bg-background/80 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Weekly Strategy
                </h3>
                <p className="text-sm text-muted-foreground">{suggestions.weekly_summary}</p>
              </div>

              <Tabs defaultValue="updates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="updates">Task Updates ({suggestions.updates?.length || 0})</TabsTrigger>
                  <TabsTrigger value="new">New Items ({suggestions.new_items?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="updates" className="space-y-3">
                  {suggestions.updates?.length > 0 ? (
                    suggestions.updates.map((update, index) => (
                      <motion.div
                        key={update.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 border border-border rounded-lg bg-card/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {currentTasks.find(t => t.id === update.id)?.title || `${update.type} Update`}
                            </h4>
                            {update.suggested_changes.start_time && (
                              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(update.suggested_changes.start_time), 'PPP p')}
                                {update.suggested_changes.end_time && ` - ${format(new Date(update.suggested_changes.end_time), 'p')}`}
                              </div>
                            )}
                            {update.suggested_changes.scheduling_note && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 p-2 bg-purple-500/10 rounded-md">
                                💡 {update.suggested_changes.scheduling_note}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {update.type}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcceptUpdate(update)}>
                            Apply Update
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No updates suggested for existing tasks.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="new" className="space-y-3">
                  {suggestions.new_items?.length > 0 ? (
                    suggestions.new_items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 border border-border rounded-lg bg-card/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground flex items-center gap-2">
                              {item.type === 'task' ? <ListTodo className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                              {item.title}
                            </h4>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(item.start_time), 'PPP p')} - {format(new Date(item.end_time), 'p')}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            {item.scheduling_note && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 p-2 bg-purple-500/10 rounded-md">
                                💡 {item.scheduling_note}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Badge variant={item.type === 'task' ? 'secondary' : 'default'}>
                              {item.type}
                            </Badge>
                            {item.priority && (
                              <Badge variant={item.priority === 'high' || item.priority === 'urgent' ? 'destructive' : 'outline'}>
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcceptNewItem(item)}>
                            Add to Schedule
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No new items suggested.
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleAcceptPlan} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Entire Plan
                </Button>
                <Button variant="outline" onClick={() => setSuggestions(null)}>
                  Dismiss
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}