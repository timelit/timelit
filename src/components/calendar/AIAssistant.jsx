import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Sparkles, Clock, Calendar, Lightbulb, CalendarDays, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/api/integrations";
import { Event } from "@/api/entities";
import { Task } from "@/api/entities";
import { format } from 'date-fns';

export default function AIAssistant({ onSuggestEvent }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const quickPrompts = [
    "Schedule a team meeting next week",
    "Block time for focused work",
    "Plan my exercise routine",
    "Set up coffee with a colleague"
  ];

  const handleSubmit = async (prompt = input) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setSuggestions([]);

    const eventSchema = Event.schema().properties;

    try {
      // Get user preferences and existing events for smart scheduling
      const [user, userPrefs, existingEvents] = await Promise.all([
        User.me(),
        UserPreferences.filter({ created_by: (await User.me()).email }),
        Event.filter({ created_by: (await User.me()).email })
      ]);
      
      const preferences = userPrefs.length > 0 ? userPrefs[0] : {};
      const workStartTime = preferences.work_start_time || "09:00";
      const workEndTime = preferences.work_end_time || "17:00";
      
      // Create a summary of existing events for conflict detection
      const existingEventsContext = existingEvents.map(event => ({
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        date: new Date(event.start_time).toDateString()
      }));

      const response = await InvokeLLM({
          prompt: `You are a smart calendar assistant. Based on the following request, suggest one or more calendar events. 

IMPORTANT SCHEDULING RULES:
1. User's work hours are ${workStartTime} to ${workEndTime}.
2. Prioritize scheduling new events within these work hours.
3. Check for time conflicts with the user's existing events.
4. If a direct conflict exists within work hours, find the next available slot within work hours.
5. If work hours are completely full on a given day, schedule the event in the evening (e.g., after ${workEndTime}).
6. Avoid scheduling during weekends (Saturday, Sunday) unless the user's request specifically mentions it.
7. Default event duration should be 1 hour unless the context of the request suggests a different length.

Current date: ${new Date().toLocaleDateString()}
User's work hours: ${workStartTime} - ${workEndTime}

Existing events to avoid conflicts with:
${existingEventsContext.map(e => `- ${e.title}: ${new Date(e.start_time).toLocaleString()} to ${new Date(e.end_time).toLocaleString()}`).join('\n')}

User request: "${prompt}"

For each suggestion you create:
- Strictly follow all scheduling rules above.
- Determine if it's a "task" (work to be done) or an "event" (meeting, appointment).
- Provide realistic start and end times based on the current date and the rules.
- Add a "scheduling_note" explaining *why* a specific time was chosen, especially if it had to be moved due to a conflict or placed outside work hours.`,
          
          response_json_schema: {
              type: "object",
              properties: {
                  suggestions: {
                      type: "array",
                      items: {
                          type: "object",
                          properties: {
                              ...eventSchema,
                              type: { 
                                type: "string", 
                                enum: ["task", "event"], 
                                description: "Whether this should be treated as a task or event." 
                              },
                              scheduling_note: {
                                type: "string",
                                description: "An explanation of why this time was chosen, especially if there was a conflict."
                              },
                              confidence: { type: "number", description: "Confidence score from 0 to 100 on how well the suggestion matches the request." }
                          },
                          required: ["title", "start_time", "end_time", "type"]
                      }
                  }
              },
              required: ["suggestions"]
          },
          add_context_from_internet: true,
      });

      const processedSuggestions = response.suggestions.map(s => ({...s, ai_suggested: true}));
      setSuggestions(processedSuggestions);
      setInput("");
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion) => {
    onSuggestEvent(suggestion);
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleAcceptAll = () => {
    onSuggestEvent(suggestions);
    setSuggestions([]);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            Quick Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Use natural language to schedule events, block focus time, or plan your week. The AI will analyze your request and suggest new calendar entries.
            </p>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'Plan a 1-hour workout session every Mon, Wed, Fri morning next week.'"
              className="bg-background border-primary/20 focus:border-primary/40 text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
            <Button 
              onClick={() => handleSubmit()}
              disabled={isLoading || !input.trim()}
              className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Quick prompts:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(prompt)}
                  disabled={isLoading}
                  className="text-xs bg-background/80 hover:bg-accent border-border text-foreground hover:text-foreground"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                AI Suggestions
              </h3>
              {suggestions.length > 1 && (
                <Button onClick={handleAcceptAll} size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                  Add All to Calendar
                </Button>
              )}
            </div>
            
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border border-border rounded-lg bg-card/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {suggestion.type === 'task' ? <ListTodo className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      {suggestion.title}
                    </h4>
                    <div className="text-sm text-muted-foreground mt-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {format(new Date(suggestion.start_time), 'PPP p')} - {format(new Date(suggestion.end_time), 'p')}
                    </div>
                    {suggestion.scheduling_note && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 p-2 bg-blue-500/10 rounded-md">
                        <span className="font-semibold">💡 Scheduling Note:</span> {suggestion.scheduling_note}
                      </div>
                    )}
                  </div>
                  <Badge variant={suggestion.type === 'task' ? 'secondary' : 'default'} className="ml-2">
                    {suggestion.type === 'task' ? 'Task' : 'Event'}
                  </Badge>
                </div>
                
                {suggestion.description && (
                  <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {suggestion.category && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.category}
                      </Badge>
                    )}
                    {suggestion.priority && suggestion.priority !== 'medium' && (
                      <Badge variant={suggestion.priority === 'high' || suggestion.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                        {suggestion.priority}
                      </Badge>
                    )}
                    {suggestion.confidence && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs">
                          {Math.round(suggestion.confidence)}% match
                        </Badge>
                      )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Add to Calendar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSuggestions(prev => prev.filter(s => s !== suggestion))}
                      className="border-border"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}