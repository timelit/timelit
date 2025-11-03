
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin, Users } from "lucide-react";
import { format, addHours } from "date-fns"; // Added addHours

export default function CreateEventModal({ isOpen, onClose, onEventCreate, initialData, initialDate, preferences }) { // Changed onSave to onEventCreate, Added initialDate
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    start_time: initialDate ? format(new Date(initialDate), "yyyy-MM-dd'T'HH:mm") : "", // Using initialDate directly
    end_time: initialDate ? format(addHours(new Date(initialDate), 1), "yyyy-MM-dd'T'HH:mm") : "", // Using initialDate and addHours
    location: "",
    category: preferences?.default_event_category || "personal",
    priority: preferences?.default_event_priority || "medium",
    is_all_day: false, // New field
    color: preferences?.event_categories?.find(c => c.name === (preferences?.default_event_category || "personal"))?.color || "#8b5cf6", // New field
    attendees: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      const defaultCategory = preferences?.default_event_category || "personal";
      const categoryColor = preferences?.event_categories?.find(c => c.name === defaultCategory)?.color;
      setEventData({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        category: defaultCategory,
        priority: preferences?.default_event_priority || "medium",
        is_all_day: false,
        color: categoryColor || "#8b5cf6",
        attendees: []
      });
      return;
    }

    // Modal is open
    if (initialData) {
      // Editing an existing event
      const categoryColor = preferences?.event_categories?.find(c => c.name === (initialData.category || preferences?.default_event_category || "personal"))?.color;
      setEventData({
        title: initialData.title || "",
        description: initialData.description || "",
        start_time: initialData.start_time ? format(new Date(initialData.start_time), "yyyy-MM-dd'T'HH:mm") : "",
        end_time: initialData.end_time ? format(new Date(initialData.end_time), "yyyy-MM-dd'T'HH:mm") : "",
        location: initialData.location || "",
        category: initialData.category || preferences?.default_event_category || "personal",
        priority: initialData.priority || preferences?.default_event_priority || "medium",
        is_all_day: initialData.is_all_day || false, // Populate new field
        color: initialData.color || categoryColor || "#8b5cf6", // Populate new field
        attendees: initialData.attendees || []
      });
    } else {
      // Creating a new event
      const baseDate = initialDate ? new Date(initialDate) : new Date();
      const roundedMinutes = Math.round(baseDate.getMinutes() / 15) * 15;
      const startTime = new Date(baseDate);
      startTime.setMinutes(roundedMinutes, 0, 0);
      
      const duration = preferences?.default_event_duration || 60; // Duration in minutes
      const endTime = addHours(startTime, duration / 60); // Use addHours from date-fns

      const defaultCategory = preferences?.default_event_category || "personal";
      const categoryColor = preferences?.event_categories?.find(c => c.name === defaultCategory)?.color;

      setEventData({
        title: "",
        description: "",
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(endTime, "yyyy-MM-dd'T'HH:mm"),
        location: "",
        category: defaultCategory,
        priority: preferences?.default_event_priority || "medium",
        is_all_day: false, // Default for new event
        color: categoryColor || "#8b5cf6", // Default for new event
        attendees: []
      });
    }
  }, [isOpen, initialData, initialDate, preferences]); // Added initialDate to dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onEventCreate({ // Changed onSave to onEventCreate
        ...eventData,
        start_time: new Date(eventData.start_time).toISOString(),
        end_time: new Date(eventData.end_time).toISOString(),
      });
      onClose();
      // The state reset is now handled by useEffect when onClose sets isOpen to false
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-neutral-100">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Create New Event
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
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                id="location"
                value={eventData.location}
                onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Add location"
                className="pl-10 bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category" className="text-neutral-200">Category</Label>
              <Select value={eventData.category} onValueChange={(value) => setEventData(prev => ({ 
                ...prev, 
                category: value,
                color: preferences?.event_categories?.find(c => c.name === value)?.color || "#8b5cf6" // Update color when category changes
              }))}>
                <SelectTrigger className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {/* Render categories dynamically from preferences or use static defaults */}
                  {preferences?.event_categories?.length > 0 ? (
                    preferences.event_categories.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name} className="text-neutral-100">
                        {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="work" className="text-neutral-100">Work</SelectItem>
                      <SelectItem value="personal" className="text-neutral-100">Personal</SelectItem>
                      <SelectItem value="meeting" className="text-neutral-100">Meeting</SelectItem>
                      <SelectItem value="appointment" className="text-neutral-100">Appointment</SelectItem>
                      <SelectItem value="reminder" className="text-neutral-100">Reminder</SelectItem>
                      <SelectItem value="travel" className="text-neutral-100">Travel</SelectItem>
                      <SelectItem value="social" className="text-neutral-100">Social</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority" className="text-neutral-200">Priority</Label>
              <Select value={eventData.priority} onValueChange={(value) => setEventData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="mt-1 bg-neutral-800 border-neutral-700 text-neutral-100">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-700">
            <Button type="button" variant="outline" onClick={onClose} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
