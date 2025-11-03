import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function EditEventModal({ event, isOpen, onClose, onSave, onDelete }) {
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    category: "personal",
    priority: "medium",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setEventData({
        title: event.title || "",
        description: event.description || "",
        start_time: event.start_time ? format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm") : "",
        end_time: event.end_time ? format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm") : "",
        location: event.location || "",
        category: event.category || "personal",
        priority: event.priority || "medium",
      });
    }
  }, [isOpen, event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(event.id, {
        ...eventData,
        start_time: new Date(eventData.start_time).toISOString(),
        end_time: new Date(eventData.end_time).toISOString(),
      });
      toast.success("Event updated");
      onClose();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await onDelete(event);
      toast.success("Event deleted");
      onClose();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-neutral-100">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Edit Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="title" className="text-neutral-200">Event Title *</Label>
            <Input
              id="title"
              value={eventData.title}
              onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What's the event?"
              required
              className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-neutral-200">Description</Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add details..."
              rows={2}
              className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_time" className="text-neutral-200">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={eventData.start_time}
                onChange={(e) => setEventData(prev => ({ ...prev, start_time: e.target.value }))}
                required
                className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div>
              <Label htmlFor="end_time" className="text-neutral-200">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={eventData.end_time}
                onChange={(e) => setEventData(prev => ({ ...prev, end_time: e.target.value }))}
                required
                className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location" className="text-neutral-200">Location</Label>
            <Input
              id="location"
              value={eventData.location}
              onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Add location"
              className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category" className="text-neutral-200">Category</Label>
              <Select
                value={eventData.category}
                onValueChange={(value) => setEventData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category" className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="work" className="text-neutral-100">Work</SelectItem>
                  <SelectItem value="personal" className="text-neutral-100">Personal</SelectItem>
                  <SelectItem value="meeting" className="text-neutral-100">Meeting</SelectItem>
                  <SelectItem value="appointment" className="text-neutral-100">Appointment</SelectItem>
                  <SelectItem value="reminder" className="text-neutral-100">Reminder</SelectItem>
                  <SelectItem value="travel" className="text-neutral-100">Travel</SelectItem>
                  <SelectItem value="social" className="text-neutral-100">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-neutral-200">Priority</Label>
              <Select
                value={eventData.priority}
                onValueChange={(value) => setEventData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger id="priority" className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="low" className="text-neutral-100">Low</SelectItem>
                  <SelectItem value="medium" className="text-neutral-100">Medium</SelectItem>
                  <SelectItem value="high" className="text-neutral-100">High</SelectItem>
                  <SelectItem value="urgent" className="text-neutral-100">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading || event.isGoogleEvent}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || event.isGoogleEvent} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {event.isGoogleEvent && (
            <p className="text-xs text-neutral-500 text-center">
              Google Calendar events cannot be edited from Timelit
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}