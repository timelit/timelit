import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, CheckCircle, ListTodo, Sparkles } from "lucide-react";
import { useData } from "../providers/DataProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function EventOrganizer() {
  const { events, tasks, googleEvents, preferences, updatePreferences, isDataLoading, categorizationProgress, triggerCategorization } = useData();

  const uncategorizedCount = useMemo(() => {
    const timelitUncategorizedEvents = events.filter(e => !e.isGoogleEvent && !e.category).length;
    const categorizedGoogleEventIds = new Set(events.map(e => e.source_google_event_id).filter(Boolean));
    const googleUncategorized = googleEvents.filter(ge => !categorizedGoogleEventIds.has(ge.google_event_id)).length;
    const taskUncategorized = tasks.filter(t => !t.category).length;
    return timelitUncategorizedEvents + googleUncategorized + taskUncategorized;
  }, [events, tasks, googleEvents]);

  const handleAutoOrganizeToggle = (checked) => {
    updatePreferences({ auto_categorize_events: checked });
    toast.success(`Auto-organization has been ${checked ? 'enabled' : 'disabled'}.`);
    if (checked && uncategorizedCount > 0) {
      toast.info("Categorization will begin shortly in the background.");
    }
  };

  const isOrganizing = categorizationProgress.isActive;
  const progressPercentage = categorizationProgress.total > 0 ? 
    (categorizationProgress.completed / categorizationProgress.total) * 100 : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <BrainCircuit className="w-5 h-5 text-purple-500" />
          AI Organizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Let the AI automatically categorize all your existing and new events and tasks to clean up your schedule and statistics.
        </p>

        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <Label htmlFor="auto-organize-switch" className="font-semibold text-foreground">Enable Auto-Organization</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, automatically analyzes and categorizes new items in the background.
              </p>
            </div>
            <Switch
              id="auto-organize-switch"
              checked={preferences?.auto_categorize_events || false}
              onCheckedChange={handleAutoOrganizeToggle}
              disabled={isDataLoading}
              className="mt-1"
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
                <Button 
                    onClick={triggerCategorization}
                    disabled={isOrganizing || uncategorizedCount === 0}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Organize Now
                </Button>

                <div className="text-sm text-muted-foreground">
                {isOrganizing ? (
                    <span>Processing {categorizationProgress.completed}/{categorizationProgress.total}...</span>
                ) : uncategorizedCount > 0 ? (
                    <span className="text-yellow-500">{uncategorizedCount} items to organize</span>
                ) : (
                    <span className="text-green-500 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> All organized!</span>
                )}
                </div>
            </div>

            {isOrganizing && (
              <div className="mt-3 space-y-1">
                <Progress 
                  value={progressPercentage} 
                  className="w-full h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progressPercentage)}%</span>
                  <span>{categorizationProgress.completed} / {categorizationProgress.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}