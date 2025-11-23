import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { timelit } from "@/api/timelitClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfToday,
  isSameMonth,
  getDay,
} from "date-fns";
import { useData } from "../components/providers/DataProvider";
import { ChevronLeft, ChevronRight, Loader2, Plus, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import EventDetailsModal from "../components/calendar/EventDetailsModal";
import CreateEventModal from "../components/calendar/CreateEventModal";
import EditEventModal from "../components/calendar/EditEventModal";
// import SmartTaskScheduler from "./SmartTaskScheduler";
import SmartTaskScheduler from "@/components/scheduling/SmartTaskScheduler";
import { useCalendarDate } from "../components/providers/CalendarDateProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CalendarInsights from "../components/calendar/CalendarInsights";
import MiniCalendar from "../components/calendar/MiniCalendar";

const HOUR_HEIGHT = 48;
const timeSlots = Array.from({ length: 24 }, (_, i) => i);
const SNAP_MINUTES = 15;

const EventCard = React.memo(({
  event,
  duration,
  hourHeight,
  isSelected,
  onClick,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onResizeStart,
  isDragging,
  preferences
}) => {
  const isCompleted = event.task_status === "done" || (event.title && event.title.includes("✓"));
  
  let bgColor;
  
  // ALWAYS prioritize category color if it exists and auto-categorization is enabled
  if (preferences?.auto_categorize_events && event.color) {
    bgColor = event.color;
  } else if (event.isGoogleEvent) {
    bgColor = '#3b82f6';
  } else if (isCompleted) {
    bgColor = '#10b981';
  } else {
    const priorityColors = {
      urgent: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6'
    };
    bgColor = priorityColors[event.priority] || '#6366f1';
  }
  
  const height = Math.max(duration * hourHeight - 1, 20);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.shiftKey) {
      onSelect(event.id, true);
    } else if (e.metaKey || e.ctrlKey) {
      onSelect(event.id, false);
    } else {
      onSelect(event.id, false);
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onDoubleClick(event);
  };

  const handleDragStart = (e) => {
    if (event.isGoogleEvent) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.opacity = '0.7';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    onDragStart(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    onDragEnd();
  };

  const handleResizeMouseDown = (e, direction) => {
    if (event.isGoogleEvent) return;
    e.stopPropagation();
    e.preventDefault();
    onResizeStart(event, direction, e);
  };

  return (
    <div
      draggable={!event.isGoogleEvent}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`absolute inset-x-0 rounded-sm overflow-hidden select-none group
        ${isSelected ? 'ring-2 ring-white z-30 brightness-110' : 'hover:brightness-110'}
        ${isDragging ? 'opacity-50' : ''}
        ${!event.isGoogleEvent ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ height: `${height}px`, backgroundColor: bgColor }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {!event.isGoogleEvent && height > 30 && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity z-10"
          onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
        />
      )}
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-center pointer-events-none">
        <div className="text-xs font-medium text-white truncate leading-tight">
          {event.title}
        </div>
        {duration > 0.5 && (
          <div className="text-[10px] text-white/80 truncate">
            {format(new Date(event.start_time), 'h:mm a')}
          </div>
        )}
        {preferences?.auto_categorize_events && event.category && duration > 0.5 && (
          <div className="text-[9px] text-white/60 truncate capitalize mt-0.5">
            {event.category}
          </div>
        )}
      </div>
      {!event.isGoogleEvent && height > 30 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity z-10"
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
        />
      )}
    </div>
  );
});

export default function CalendarPage() {
  const {
    events,
    tasks,
    isLoading,
    error,
    deleteEvent,
    updateEvent,
    addEvent,
    hideGoogleEvent,
    loadGoogleEventsForRange,
    preferences,
    updateTask,
  } = useData();

  console.log('(c) Calendar re-renders with events:', events?.length || 0);

  const { currentDate, setCurrentDate } = useCalendarDate();
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSelectedEventId, setLastSelectedEventId] = useState(null);
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState('week');

  const [dragGhost, setDragGhost] = useState(null);
  const [showInvalidDropFeedback, setShowInvalidDropFeedback] = useState(false);

  const scrollContainerRef = useRef(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();

  const visibleDays = useMemo(() => {
    switch (calendarView) {
      case 'day':
        return [currentDate];
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate)
        });
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calStart, end: calEnd });
      case 'year':
        return eachDayOfInterval({
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        });
      default:
        return eachDayOfInterval({
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate)
        });
    }
  }, [currentDate, calendarView]);

  useEffect(() => {
    if (scrollContainerRef.current && (calendarView === 'day' || calendarView === 'week')) {
      hasScrolledRef.current = false;
      
      const scrollTo7am = () => {
        if (scrollContainerRef.current && !hasScrolledRef.current) {
          const scrollTo = 7 * HOUR_HEIGHT;
          scrollContainerRef.current.scrollTop = scrollTo;
          hasScrolledRef.current = true;
        }
      };

      scrollTo7am();
      
      const timeoutId = setTimeout(scrollTo7am, 50);
      
      const animationTimeout = setTimeout(scrollTo7am, 200);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(animationTimeout);
      };
    } else if (hasScrolledRef.current) {
        hasScrolledRef.current = false;
    }
  }, [calendarView, currentDate, visibleDays]);

  useEffect(() => {
    if (scrollContainerRef.current && (calendarView === 'day' || calendarView === 'week') && !hasScrolledRef.current && !isLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current && !hasScrolledRef.current) {
            const scrollTo = 7 * HOUR_HEIGHT;
            scrollContainerRef.current.scrollTop = scrollTo;
            hasScrolledRef.current = true;
          }
        });
      });
    }
  }, [isLoading, calendarView, hasScrolledRef]);

  const getItemsForDay = useCallback((day) => {
    if (!day) return [];
    
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter((event) => {
      try {
        if (!event || !event.start_time || !event.end_time) {
          console.warn('Invalid event structure:', event);
          return false;
        }
        
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        
        // Check if event is valid
        if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
          console.warn('Invalid event dates:', event);
          return false;
        }
        
        return eventStart < dayEnd && eventEnd > dayStart;
      } catch (error) {
        console.error('Error filtering event:', event, error);
        return false;
      }
    });
  }, [events]);

  const dayItemsMap = useMemo(() => {
    const map = new Map();
    visibleDays.forEach(day => {
      map.set(day.toISOString(), getItemsForDay(day));
    });
    return map;
  }, [visibleDays, getItemsForDay]);

  const navigateTime = useCallback(async (direction) => {
    let newDate;
    switch (calendarView) {
      case 'day':
        newDate = direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
        break;
      case 'week':
        newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
        break;
      case 'month':
        newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        break;
      case 'year':
        newDate = direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1);
        break;
      default:
        newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    }
    setCurrentDate(newDate);

    if (calendarView === 'month') {
      setIsFetchingMore(true);
      const rangeStart = startOfMonth(newDate);
      const rangeEnd = endOfMonth(newDate);
      await loadGoogleEventsForRange(rangeStart, rangeEnd);
      setIsFetchingMore(false);
    }
  }, [currentDate, setCurrentDate, loadGoogleEventsForRange, calendarView]);

  const handleCalendarClick = useCallback(() => {
    if (selectedEventIds.size > 0) {
      setSelectedEventIds(new Set());
      setLastSelectedEventId(null);
    }
  }, [selectedEventIds.size]);

  const handleTimeSlotClick = useCallback(async (e, day, hour) => {
    if (draggedEvent || resizingEvent || calendarView === 'month' || calendarView === 'year') return;
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesOffset = Math.round((offsetY / HOUR_HEIGHT) * 60);
    const snappedMinutes = Math.round(minutesOffset / 15) * 15;

    const startTime = new Date(day);
    startTime.setHours(hour, snappedMinutes, 0, 0);

    const duration = preferences?.default_event_duration || 60;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    // Set the initial date for the modal
    setIsCreateEventModalOpen(true);
    // The modal will handle the creation with proper form validation
  }, [draggedEvent, resizingEvent, calendarView]);

  const handleNewEventClick = useCallback(() => {
    setIsCreateEventModalOpen(true);
  }, []);

  const handleCreateEvent = useCallback(async (eventData) => {
    try {
      const scheduler = new SmartTaskScheduler(events, tasks, preferences);
      const result = scheduler.scheduleTask({
        title: eventData.title,
        description: eventData.description,
        duration: eventData.duration || 60,
        category: eventData.category,
        priority: eventData.priority
      });

      if (result.success) {
        await Promise.all([
          ...result.newEvents.map(e => addEvent(e)),
          updateTask(result.taskUpdate.id, result.taskUpdate)
        ]);
        toast.success("Event created and scheduled!");
      } else {
        await addEvent(eventData);
        toast.success("Event created but could not be auto-scheduled");
      }
      
      setIsCreateEventModalOpen(false);
    } catch (error) {
      console.error("Failed to create event:", error);
      toast.error("Failed to create event");
    }
  }, [addEvent, events, tasks, preferences]);

  const handleEventSelect = useCallback((eventId, isShiftClick) => {
    if (isShiftClick && lastSelectedEventId) {
      const allEventIds = events.map(e => e.id);
      const lastIndex = allEventIds.indexOf(lastSelectedEventId);
      const currentIndex = allEventIds.indexOf(eventId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = allEventIds.slice(start, end + 1);
        setSelectedEventIds(prev => new Set([...prev, ...rangeIds]));
      }
      setLastSelectedEventId(eventId);
    } else {
      setSelectedEventIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(eventId)) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });
      setLastSelectedEventId(eventId);
    }
  }, [events, lastSelectedEventId]);

  const handleEventDoubleClick = useCallback((event) => {
    if (event.isGoogleEvent) {
      setDetailsEvent(event);
      setIsDetailsModalOpen(true);
    } else {
      setEditingEvent(event);
      setIsEditModalOpen(true);
    }
  }, []);

  const handleSaveEdit = useCallback(async (eventId, updates) => {
    try {
      await updateEvent(eventId, updates);
      toast.success("Event updated!");
      setIsEditModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
      throw error;
    }
  }, [updateEvent]);

  const handleDeleteFromDetails = useCallback(async (event) => {
    try {
      if (event.isGoogleEvent) {
        await hideGoogleEvent(event);
        toast.success("Event hidden");
      } else {
        await deleteEvent(event.id);
        toast.success("Event deleted");
      }
      setIsDetailsModalOpen(false);
      setDetailsEvent(null);
      setIsEditModalOpen(false);
      setEditingEvent(null);
      setSelectedEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.id);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  }, [deleteEvent, hideGoogleEvent]);

  const snapToInterval = useCallback((date) => {
    const minutes = date.getMinutes();
    const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    const newDate = new Date(date);
    newDate.setMinutes(snappedMinutes, 0, 0);
    return newDate;
  }, []);

  const handleDragStart = useCallback((event) => {
    setDraggedEvent(event);
    setSelectedEventIds(new Set());
    
    setDragGhost({
      title: event.title,
      duration: (new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60),
      color: event.color
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
    setDropTarget(null);
    setDragPreview(null);
    setDragGhost(null);
    setShowInvalidDropFeedback(false);
  }, []);

  const handleDragOver = useCallback((e, day, hour) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedEvent || calendarView === 'month' || calendarView === 'year') {
      setShowInvalidDropFeedback(true);
      return;
    }

    setShowInvalidDropFeedback(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesOffset = Math.round((offsetY / HOUR_HEIGHT) * 60);
    const snappedMinutes = Math.round(minutesOffset / 15) * 15;

    const previewStart = new Date(day);
    previewStart.setHours(hour, snappedMinutes, 0, 0);

    const originalStart = new Date(draggedEvent.start_time);
    const originalEnd = new Date(draggedEvent.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const previewEnd = new Date(previewStart.getTime() + durationMs);

    setDropTarget({ day, hour });
    setDragPreview({ start: previewStart, end: previewEnd, day: new Date(day) });
  }, [draggedEvent, calendarView]);

  const handleDrop = useCallback(async (e, day, hour) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedEvent || !dragPreview || calendarView === 'month' || calendarView === 'year') return;

    try {
      const originalStart = new Date(draggedEvent.start_time);
      if (originalStart.getTime() === dragPreview.start.getTime()) {
        toast.info("Event not moved: dropped in the same slot.");
        setDraggedEvent(null);
        setDropTarget(null);
        setDragPreview(null);
        return;
      }

      const confirmed = window.confirm(
        `Move "${draggedEvent.title}" to ${format(dragPreview.start, 'MMM d, h:mm a')}?`
      );

      if (confirmed) {
        if (draggedEvent.isTaskEvent) {
          const taskId = draggedEvent.task_id;
          const duration = (dragPreview.end.getTime() - dragPreview.start.getTime()) / (1000 * 60);
          await updateTask(taskId, {
            scheduled_start_time: dragPreview.start.toISOString(),
            duration: Math.max(15, Math.round(duration / 15) * 15) // Snap to 15min
          });
          toast.success('Task schedule updated');
        } else {
          await updateEvent(draggedEvent.id, {
            start_time: dragPreview.start.toISOString(),
            end_time: dragPreview.end.toISOString(),
          });
          toast.success('Event moved');
        }
      } else {
        toast.info('Move cancelled');
      }
    } catch (error) {
      console.error('Error moving event:', error);
      toast.error('Failed to move event');
    } finally {
      setDraggedEvent(null);
      setDropTarget(null);
      setDragPreview(null);
    }
  }, [draggedEvent, dragPreview, updateEvent, updateTask, calendarView]);

  const handleResizeStart = useCallback((event, direction, mouseEvent) => {
    if (calendarView === 'month' || calendarView === 'year') return;
    mouseEvent.stopPropagation();
    setResizingEvent({ event, direction, startY: mouseEvent.clientY });
    setSelectedEventIds(new Set());
  }, [calendarView]);

  const handleBulkDeleteEvents = useCallback(async () => {
    if (selectedEventIds.size === 0) return;

    const eventsToDelete = Array.from(selectedEventIds).map(id =>
      events.find(e => e.id === id)
    ).filter(Boolean);

    const confirmed = window.confirm(
      `Delete ${selectedEventIds.size} event${selectedEventIds.size > 1 ? 's' : ''}?`
      );

    if (!confirmed) return;

    try {
      await Promise.all(
        eventsToDelete.map(event => {
          if (event.isGoogleEvent) {
            return hideGoogleEvent(event);
          } else {
            return deleteEvent(event.id);
          }
        })
      );
      toast.success(`${selectedEventIds.size} event${selectedEventIds.size > 1 ? 's' : ''} deleted`);
      setSelectedEventIds(new Set());
      setLastSelectedEventId(null);
    } catch (error) {
      console.error('Failed to delete events:', error);
      toast.error('Failed to delete some events');
    }
  }, [selectedEventIds, events, deleteEvent, hideGoogleEvent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement.tagName === 'INPUT' ||
                       activeElement.tagName === 'TEXTAREA' ||
                       activeElement.isContentEditable ||
                       isCreateEventModalOpen ||
                       isDetailsModalOpen ||
                       isEditModalOpen;

      if (isTyping) return;

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedEventIds.size > 0) {
        e.preventDefault();
        handleBulkDeleteEvents();
        return;
      }

      if (e.key === 'Escape' && selectedEventIds.size > 0) {
        e.preventDefault();
        setSelectedEventIds(new Set());
        setLastSelectedEventId(null);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allEventIds = new Set(events.map(e => e.id));
        setSelectedEventIds(allEventIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedEventIds,
    events,
    handleBulkDeleteEvents,
    isCreateEventModalOpen,
    isDetailsModalOpen,
    isEditModalOpen
  ]);

  useEffect(() => {
    if (!resizingEvent || calendarView === 'month' || calendarView === 'year') return;

    let animationFrameId = null;
    let lastUpdateTime = 0;
    const THROTTLE_MS = 16;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) return;
      lastUpdateTime = now;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const deltaY = e.clientY - resizingEvent.startY;
        const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60);
        const snappedDelta = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES;

        const originalStart = new Date(resizingEvent.event.start_time);
        const originalEnd = new Date(resizingEvent.event.end_time);

        let newStart = new Date(originalStart);
        let newEnd = new Date(originalEnd);

        if (resizingEvent.direction === 'top') {
          newStart = new Date(originalStart.getTime() + snappedDelta * 60 * 1000);
          if (newEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
            newStart = new Date(newEnd.getTime() - 15 * 60 * 1000);
          }
        } else {
          newEnd = new Date(originalEnd.getTime() + snappedDelta * 60 * 1000);
          if (newEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
            newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
          }
        }

        if (newStart.getTime() >= newEnd.getTime()) {
          if (resizingEvent.direction === 'top') {
            newStart = new Date(newEnd.getTime() - 15 * 60 * 1000);
          } else {
            newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
          }
        }

        setDragPreview({ start: newStart, end: newEnd, day: new Date(originalStart) });
      });
    };

    const handleMouseUp = async () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      if (dragPreview && resizingEvent) {
        try {
          const originalStart = new Date(resizingEvent.event.start_time);
          const originalEnd = new Date(resizingEvent.event.end_time);

          if (originalStart.getTime() !== dragPreview.start.getTime() || originalEnd.getTime() !== dragPreview.end.getTime()) {
            const confirmed = window.confirm(
              `Change "${resizingEvent.event.title}" time to ${format(dragPreview.start, 'h:mm a')} - ${format(dragPreview.end, 'h:mm a')}?`
            );

            if (confirmed) {
              if (resizingEvent.event.isTaskEvent) {
                const taskId = resizingEvent.event.task_id;
                const duration = (dragPreview.end.getTime() - dragPreview.start.getTime()) / (1000 * 60);
                await updateTask(taskId, {
                  scheduled_start_time: dragPreview.start.toISOString(),
                  duration: Math.max(15, Math.round(duration / 15) * 15)
                });
                toast.success('Task duration updated');
              } else {
                await updateEvent(resizingEvent.event.id, {
                  start_time: dragPreview.start.toISOString(),
                  end_time: dragPreview.end.toISOString(),
                });
                toast.success('Event time updated');
              }
            } else {
                toast.info('Resize cancelled');
            }
          }
        } catch (error) {
          console.error('Error resizing event:', error);
          toast.error('Failed to resize event');
        }
      }
      setResizingEvent(null);
      setDragPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEvent, dragPreview, updateEvent, calendarView]);

  const formatTime = useCallback((hour) => {
    return hour === 0 ? '12am' :
           hour < 12 ? `${hour}am` :
           hour === 12 ? '12pm' :
           `${hour - 12}pm`;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-neutral-400 text-sm">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-950">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Error: {error}</p>
          <Button onClick={() => window.location.reload()} size="sm">Refresh</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full bg-neutral-900 text-neutral-100">
        <header className="relative flex items-center justify-between px-6 py-3 bg-neutral-900 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            {isFetchingMore && <Loader2 className="w-5 h-5 animate-spin mr-2 text-neutral-400" />}
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigateTime('prev')}
              disabled={isFetchingMore}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigateTime('next')}
              disabled={isFetchingMore}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setCurrentDate(startOfToday())}
              className="h-9 px-5 text-base font-medium"
            >
              Today
            </Button>
          </div>

          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 px-5 text-base font-medium text-neutral-100 hover:bg-neutral-800"
                >
                  <span className="capitalize">{format(currentDate, calendarView === 'year' ? 'yyyy' : calendarView === 'month' ? 'MMMM yyyy' : 'MMM d')}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-neutral-900 border-neutral-700">
                <DropdownMenuItem
                  onClick={() => setCalendarView('day')}
                  className="text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
                >
                  Day
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCalendarView('week')}
                  className="text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
                >
                  Week
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCalendarView('month')}
                  className="text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
                >
                  Month
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCalendarView('year')}
                  className="text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
                >
                  Year
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-neutral-900">
          <div className="h-full rounded-tl-[40px] bg-neutral-950 overflow-hidden">
            {(calendarView === 'day' || calendarView === 'week') && (
              <div
                ref={scrollContainerRef}
                className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
                onClick={handleCalendarClick}
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="flex flex-col min-w-[900px]">
                  <div className="flex sticky top-0 bg-neutral-950 z-20 overflow-hidden">
                    <div className="w-16 flex-shrink-0" />
                    {visibleDays.map((day) => {
                      const isCurrentDay = isToday(day);
                      return (
                        <div key={day.toISOString()} className="flex-1 text-center py-3">
                          <div className="text-xs text-neutral-500 uppercase font-medium tracking-wide">{format(day, "EEE")}</div>
                          <div className={`text-3xl font-semibold mt-1 inline-block px-3 py-1 rounded-lg ${
                            isCurrentDay ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-200'
                          }`}>
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex">
                    <div className="w-16 flex-shrink-0">
                      {timeSlots.map((hour) => (
                        <div
                          key={hour}
                          className="flex items-start justify-end pr-2 pt-1 border-b border-neutral-700/40"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                          <span className="text-xs text-neutral-500">{formatTime(hour)}</span>
                        </div>
                      ))}
                    </div>

                    <div className={`flex-1 grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
                      {visibleDays.map((day) => {
                        const isCurrentDay = isToday(day);
                        const itemsForDay = dayItemsMap.get(day.toISOString()) || [];

                        return (
                          <div key={day.toISOString()} className="relative border-l border-neutral-700/40 first:border-l-0">
                            {timeSlots.map((hour) => {
                              const isCurrentHour = isCurrentDay && hour === currentHour;
                              const isDropTarget = dropTarget &&
                                isSameDay(dropTarget.day, day) &&
                                dropTarget.hour === hour;

                              return (
                                <div
                                  key={hour}
                                  className={`relative border-b border-neutral-700/40 hover:bg-neutral-900/20 transition-colors cursor-pointer
                                    ${isCurrentHour ? 'bg-blue-950/10' : ''}
                                    ${isDropTarget ? 'bg-blue-900/30 ring-2 ring-inset ring-blue-500' : ''}
                                    ${showInvalidDropFeedback && draggedEvent ? 'bg-red-900/10' : ''}`}
                                  style={{ height: `${HOUR_HEIGHT}px` }}
                                  onDragOver={(e) => handleDragOver(e, day, hour)}
                                  onDrop={(e) => handleDrop(e, day, hour)}
                                  onClick={(e) => handleTimeSlotClick(e, day, hour)}
                                >
                                  {isCurrentDay && hour === currentHour && (
                                    <div
                                      className="absolute left-0 right-0 bg-red-500 h-[2px] z-20"
                                      style={{ top: `${(currentTime.getMinutes() / 60) * HOUR_HEIGHT}px` }}
                                    >
                                      <div className="absolute left-0 w-1.5 h-1.5 bg-red-500 rounded-full -mt-[3px] -ml-[3px]" />
                                    </div>
                                  )}

                                  {dragPreview && isSameDay(dragPreview.day, day) && hour === dragPreview.start.getHours() && (
                                    <div
                                      className="absolute left-0.5 right-0.5 bg-blue-500/40 border-2 border-blue-400 border-dashed rounded-sm z-20 pointer-events-none"
                                      style={{
                                        top: `${(dragPreview.start.getMinutes() / 60) * HOUR_HEIGHT}px`,
                                        height: `${((dragPreview.end.getTime() - dragPreview.start.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`
                                      }}
                                    >
                                      <div className="px-1.5 py-0.5 h-full flex flex-col justify-center">
                                        <div className="text-xs font-medium text-white truncate">
                                          {draggedEvent ? draggedEvent.title : resizingEvent ? resizingEvent.event.title : ''}
                                        </div>
                                        <div className="text-[10px] text-white/90 truncate font-semibold">
                                          {format(dragPreview.start, 'h:mm a')} - {format(dragPreview.end, 'h:mm a')}
                                        </div>
                                        <div className="text-[10px] text-white/70 mt-0.5">
                                          {Math.round((dragPreview.end - dragPreview.start) / (1000 * 60))} min
                                        </div>
                                      </div>
                                      <div className="absolute inset-x-0 top-0 h-px bg-blue-400" />
                                      <div className="absolute inset-x-0 bottom-0 h-px bg-blue-400" />
                                    </div>
                                  )}

                                  {itemsForDay
                                    .filter((item) => {
                                      const isCurrentlyResizing = resizingEvent && item.id === resizingEvent.event.id;
                                      if (isCurrentlyResizing) return false;

                                      const itemStart = new Date(item.start_time);
                                      return itemStart.getHours() === hour && isSameDay(itemStart, day);
                                    })
                                    .map((item) => {
                                      const startTime = new Date(item.start_time);
                                      const endTime = new Date(item.end_time);
                                      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                                      const minutesFromHour = startTime.getMinutes();
                                      const topOffset = (minutesFromHour / 60) * HOUR_HEIGHT;
                                      const isCurrentlyDragging = draggedEvent && item.id === draggedEvent.id;

                                      return (
                                        <Tooltip key={item.id}>
                                          <TooltipTrigger asChild>
                                            <div
                                              className="absolute inset-x-0 z-10"
                                              style={{ top: `${topOffset}px` }}
                                            >
                                              <EventCard
                                                event={item}
                                                duration={Math.max(duration, 0.15)}
                                                hourHeight={HOUR_HEIGHT}
                                                isSelected={selectedEventIds.has(item.id)}
                                                onSelect={handleEventSelect}
                                                onDoubleClick={handleEventDoubleClick}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                                onResizeStart={handleResizeStart}
                                                isDragging={isCurrentlyDragging}
                                                preferences={preferences}
                                              />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="bg-neutral-800 border-neutral-700">
                                            <div className="text-xs">
                                              <div className="font-semibold">{item.title}</div>
                                              <div className="text-neutral-400 mt-1">
                                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                              </div>
                                              <div className="text-neutral-500 mt-0.5">
                                                Duration: {Math.round(duration * 60)} min
                                              </div>
                                              {item.description && (
                                                <div className="text-neutral-400 mt-1 italic">
                                                  {item.description}
                                                </div>
                                              )}
                                              {item.location && (
                                                <div className="text-neutral-500 mt-0.5">
                                                  📍 {item.location}
                                                </div>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {calendarView === 'month' && (
              <div
                className="h-full overflow-y-auto overflow-x-hidden p-4"
                onClick={handleCalendarClick}
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-semibold text-neutral-200">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-neutral-500 py-2">
                      {day}
                    </div>
                  ))}
                  {visibleDays.map((day) => {
                    const dayEvents = dayItemsMap.get(day.toISOString()) || [];
                    const isCurrentDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    // This bgColor variable is declared but unused in the current implementation of the month view day cell background.
                    // The event cards within the day correctly apply their individual colors.
                    let bgColor = '#6366f1'; 
                    if (preferences?.auto_categorize_events && dayEvents.length > 0 && dayEvents[0].color) {
                      bgColor = dayEvents[0].color;
                    } else if (dayEvents.length > 0 && (dayEvents[0].task_status === "done" || (dayEvents[0].title && dayEvents[0].title.includes("✓")))) {
                      bgColor = '#10b981';
                    } else if (dayEvents.length > 0) {
                      const priorityColors = {
                        urgent: '#ef4444',
                        high: '#f97316',
                        medium: '#eab308',
                        low: '#3b82f6'
                      };
                      bgColor = priorityColors[dayEvents[0].priority] || bgColor;
                    }


                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[100px] border border-neutral-700/40 rounded-lg p-2 ${
                          !isCurrentMonth ? 'bg-neutral-900/30' : 'bg-neutral-900/50'
                        } ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isCurrentDay ? 'text-blue-400' : isCurrentMonth ? 'text-neutral-200' : 'text-neutral-600'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-110"
                              style={{ 
                                backgroundColor: (preferences?.auto_categorize_events && event.color) ? event.color : 
                                  event.isGoogleEvent ? '#3b82f6' : 
                                  (event.task_status === "done" || (event.title && event.title.includes("✓"))) ? '#10b981' :
                                  (event.priority === 'urgent' ? '#ef4444' : event.priority === 'high' ? '#f97316' : event.priority === 'medium' ? '#eab308' : event.priority === 'low' ? '#3b82f6' : '#6366f1')
                              }}
                              onClick={() => handleEventDoubleClick(event)}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-neutral-400 px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {calendarView === 'year' && (
              <div
                className="h-full overflow-y-auto overflow-x-hidden p-6"
                onClick={handleCalendarClick}
              >
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-semibold text-neutral-200">
                    {format(currentDate, 'yyyy')}
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(currentDate.getFullYear(), i, 1);
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthDate);
                    const monthDays = eachDayOfInterval({
                      start: startOfWeek(monthStart),
                      end: endOfWeek(monthEnd)
                    });

                    return (
                      <div key={i} className="bg-neutral-900/50 rounded-lg p-3">
                        <h3 className="text-center font-medium text-neutral-200 mb-2">
                          {format(monthDate, 'MMMM')}
                        </h3>
                        <div className="grid grid-cols-7 gap-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <div key={idx} className="text-center text-[10px] text-neutral-500">
                              {day}
                            </div>
                          ))}
                          {monthDays.map(day => {
                            const dayEvents = getItemsForDay(day);
                            const isCurrentDay = isToday(day);
                            const isCurrentMonthDay = isSameMonth(day, monthDate);

                            return (
                              <div
                                key={day.toISOString()}
                                className={`aspect-square text-[10px] rounded flex items-center justify-center relative
                                  ${isCurrentDay ? 'bg-blue-600 text-white font-semibold' : ''}
                                  ${!isCurrentMonthDay ? 'text-neutral-600' : 'text-neutral-300'}
                                  ${dayEvents.length > 0 && !isCurrentDay ? 'font-semibold' : ''}
                                `}
                              >
                                {format(day, 'd')}
                                {dayEvents.length > 0 && (
                                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleNewEventClick}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-100 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all z-30"
            >
              <Plus className="h-8 w-8 stroke-[2.5]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>New Event</p>
          </TooltipContent>
        </Tooltip>

        <EventDetailsModal
          event={detailsEvent}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setDetailsEvent(null);
          }}
          onDelete={handleDeleteFromDetails}
          onEdit={() => {
            setEditingEvent(detailsEvent);
            setIsEditModalOpen(true);
            setIsDetailsModalOpen(false);
            setDetailsEvent(null);
          }}
        />

        <EditEventModal
          event={editingEvent}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEdit}
          onDelete={handleDeleteFromDetails}
          preferences={preferences}
        />

        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          onEventCreate={handleCreateEvent}
          initialDate={currentDate}
          preferences={preferences}
        />
      </div>
    </TooltipProvider>
  );
}
