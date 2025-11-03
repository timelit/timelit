import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Tag, AlertCircle, Trash2, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function EventDetailsModal({ event, isOpen, onClose, onDelete, onEdit }) {
  if (!event) return null;

  const isGoogleEvent = event.isGoogleEvent;
  const isCompleted = event.task_status === "done" || (event.title && event.title.includes("✓"));

  const categoryColors = {
    work: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    personal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    meeting: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    appointment: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    reminder: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    travel: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    social: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  };

  const handleDelete = () => {
    onDelete(event);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between pr-8">
            <span className="text-xl text-neutral-100">{event.title}</span>
            {isGoogleEvent && (
              <Badge variant="outline" className="ml-2 text-xs border-neutral-600 text-neutral-400">
                <ExternalLink className="w-3 h-3 mr-1" />
                Google
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-neutral-200">
                {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-neutral-400">
                {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-400 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
              <p className="text-sm text-neutral-400">{event.location}</p>
            </div>
          )}

          {/* Category & Priority */}
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-neutral-500" />
            <div className="flex gap-2 flex-wrap">
              {event.category && (
                <Badge className={categoryColors[event.category] || "bg-neutral-700 text-neutral-300"}>
                  {event.category}
                </Badge>
              )}
              {event.priority && (
                <Badge className={priorityColors[event.priority] || "bg-neutral-700 text-neutral-300"}>
                  {event.priority} priority
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-green-900/30 text-green-400">
                  ✓ Completed
                </Badge>
              )}
            </div>
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-neutral-500 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {event.attendees.map((attendee, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-neutral-600 text-neutral-400">
                    {attendee}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggested */}
          {event.ai_suggested && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                AI Suggested
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-700">
          <Button variant="outline" onClick={onClose} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
            Close
          </Button>
          {!isGoogleEvent && (
            <>
              <Button variant="outline" onClick={() => { onEdit(event); onClose(); }} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          {isGoogleEvent && (
            <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              <X className="w-4 h-4 mr-2" />
              Hide
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}