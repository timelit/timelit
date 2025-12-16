import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TaskScheduler({ task, isOpen, onClose, onSchedule, preferences }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(task?.duration || 60);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (task?.scheduled_start_time) {
      const scheduledDate = new Date(task.scheduled_start_time);
      setSelectedDate(scheduledDate);
      setStartTime(format(scheduledDate, 'HH:mm'));
      setDuration(task.duration || 60);
    } else if (task?.due_date) {
      setSelectedDate(new Date(task.due_date));
    }
  }, [task]);

  const handleSchedule = async () => {
    if (!task) return;

    setIsScheduling(true);
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endDateTime = addMinutes(startDateTime, duration);

      const scheduledEvent = {
        title: task.title,
        description: task.description || `Scheduled: ${task.title}`,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        task_id: task.id,
        category: task.category || 'work',
        priority: task.priority || 'medium',
        ai_suggested: false
      };

      await onSchedule(task.id, {
        scheduled_start_time: startDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString(),
        scheduled_date: format(startDateTime, 'yyyy-MM-dd'),
        auto_scheduled: false
      }, scheduledEvent);

      toast.success('Task scheduled successfully!');
      onClose();
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Failed to schedule task');
    } finally {
      setIsScheduling(false);
    }
  };

  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-neutral-100">Schedule Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-neutral-200">Task</Label>
            <div className="mt-1 p-3 bg-neutral-800 rounded-md">
              <p className="text-neutral-100 font-medium">{task?.title}</p>
              {task?.description && (
                <p className="text-neutral-400 text-sm mt-1">{task.description}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-neutral-200">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-neutral-800 border-neutral-700 text-neutral-100 hover:bg-neutral-700",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-700">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="bg-neutral-900 text-neutral-100"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-neutral-200">Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 max-h-60">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time} className="text-neutral-100 hover:bg-neutral-800">
                    {format(new Date(`2000-01-01T${time}:00`), 'h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-neutral-200">Duration (minutes)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              min="15"
              max="480"
              step="15"
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          {selectedDate && startTime && duration && (
            <div className="p-3 bg-neutral-800 rounded-md">
              <p className="text-sm text-neutral-400">Scheduled for:</p>
              <p className="text-neutral-100 font-medium">
                {format(selectedDate, 'PPP')} at {format(new Date(`2000-01-01T${startTime}:00`), 'h:mm a')}
              </p>
              <p className="text-neutral-400 text-sm">
                Duration: {duration} minutes
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !selectedDate || !startTime}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}