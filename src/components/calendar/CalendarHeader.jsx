import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfToday } from "date-fns";

export default function CalendarHeader({ 
  currentDate, 
  onNavigate,
  onCreateEvent,
  onGoToday
}) {
  return (
    <div className="flex items-center justify-between p-6 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('prev')}
            className="h-9 w-9"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={onGoToday}
            className="h-9 px-4"
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('next')}
            className="h-9 w-9"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
        </div>
      </div>

      <Button 
        onClick={onCreateEvent}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Event
      </Button>
    </div>
  );
}