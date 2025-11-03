
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Sparkles, Plus, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../components/providers/DataProvider";
import { toast } from "sonner";
import AIAssistant from "../components/calendar/AIAssistant";
import WeeklyPlanningAssistant from "../components/calendar/WeeklyPlanningAssistant";

export default function AIAssistantPage() {
  const { addEvent, bulkAddEvents } = useData();
  const [suggestedEvents, setSuggestedEvents] = useState([]);

  const handleSuggestEvent = (eventOrEvents) => {
    const eventsToAdd = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
    setSuggestedEvents(prev => [...prev, ...eventsToAdd]);
  };

  const handleAcceptAll = async () => {
    if (suggestedEvents.length === 0) return;
    
    const eventsToCreate = suggestedEvents.map(({ type, scheduling_note, confidence, ...eventData }) => eventData);
    
    try {
      if (eventsToCreate.length > 1) {
        await bulkAddEvents(eventsToCreate);
      } else {
        await addEvent(eventsToCreate[0]);
      }
      toast.success(`${eventsToCreate.length} event(s) added to your calendar!`);
      setSuggestedEvents([]);
    } catch (error) {
      toast.error("Failed to add events to calendar.");
    }
  };

  const handleDismissAll = () => {
    setSuggestedEvents([]);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bot className="w-8 h-8" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-2">Your smart scheduling partner. Automate planning, organize events, and optimize your week.</p>
        </div>

        <Tabs defaultValue="quick-schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card border-border">
            <TabsTrigger value="quick-schedule" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quick Schedule
            </TabsTrigger>
            <TabsTrigger value="weekly-planning" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Weekly Planning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-schedule" className="mt-6">
            <AIAssistant onSuggestEvent={handleSuggestEvent} />
          </TabsContent>

          <TabsContent value="weekly-planning" className="mt-6">
            <WeeklyPlanningAssistant onSuggestEvent={handleSuggestEvent} />
          </TabsContent>
          
        </Tabs>

        <AnimatePresence>
          {suggestedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle>Confirm AI Suggestions</CardTitle>
                  <CardDescription>
                    Review the events suggested by the AI. Add them all to your calendar or dismiss them.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                    {suggestedEvents.map((event, index) => (
                      <div key={index} className="text-sm p-2 rounded-md bg-muted/50 border border-border">
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <p className="text-muted-foreground">
                          {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={handleDismissAll}>Dismiss All</Button>
                    <Button onClick={handleAcceptAll}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add All to Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
