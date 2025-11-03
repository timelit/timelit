import React, { useState } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ListTodo, Clock, MapPin, Users, X, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DayView({ 
  currentDate, 
  events = [], 
  tasks = [], 
  onItemClick, 
  onRightClick, 
  selectedItem, 
  preferences, 
  onDelete,
  currentTime,
  handleCreateEvent
}) {
  const isCurrentDay = isToday(currentDate);
  
  // Generate time slots from 00:00 to 23:00 for a 24-hour calendar view
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Get events for the current date
  const dayEvents = events.filter(event => {
    const eventStart = new Date(event.start_time);
    return isSameDay(eventStart, currentDate);
  }).filter(event => {
    if (!preferences?.show_completed_tasks && event.task_id) {
      return !(event.task_status === 'done' || event.title.includes('✓'));
    }
    return true;
  });

  // Get tasks for the current date
  const dayTasks = tasks.filter(task => {
    if (task.status === 'done' && !preferences?.show_completed_tasks) return false;
    
    if (task.scheduled_start_time) {
      return isSameDay(new Date(task.scheduled_start_time), currentDate);
    }
    
    if (task.due_date) {
      return isSameDay(new Date(task.due_date), currentDate);
    }
    
    return false;
  });

  // Combine events and tasks for display
  const allItems = [
    ...dayEvents,
    ...dayTasks.map(task => ({
      ...task,
      isTask: true,
      type: 'task',
      start_time: task.scheduled_start_time || task.due_date,
      end_time: task.scheduled_end_time || task.due_date,
    }))
  ];

  const formatTime = (hour) => {
    const timeFormat = preferences?.time_format || '12';
    if (timeFormat === '24') {
      return `${String(hour).padStart(2, '0')}:00`;
    }
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const EventBubble = ({ event, onClick, onRightClick }) => {
    const isTaskEvent = !!event.task_id;
    const isTask = !!event.isTask;
    const isGoogleEvent = !!event.isGoogleEvent;
    const isCompleted = (isTaskEvent && (event.task_status === 'done' || event.title.includes('✓'))) || 
                       (isTask && event.status === 'done');
    
    let backgroundColor;
    let borderColor;
    
    if (isGoogleEvent) {
      backgroundColor = '#4285F4';
      borderColor = '#1a73e8';
    } else if (isTask) {
      if (isCompleted) {
        backgroundColor = '#22c55e';
        borderColor = '#16a34a';
      } else {
        const priorityColors = {
          low: '#64748b',
          medium: '#f59e0b', 
          high: '#f97316',
          urgent: '#dc2626'
        };
        backgroundColor = priorityColors[event.priority] || priorityColors.medium;
        borderColor = backgroundColor;
      }
    } else if (isTaskEvent) {
      backgroundColor = isCompleted ? '#22c55e' : '#6b7280';
      borderColor = isCompleted ? '#16a34a' : '#374151';
    } else {
      backgroundColor = event.color || '#3b82f6';
      borderColor = backgroundColor;
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`group p-2 rounded-md text-xs text-white cursor-pointer mb-1 border-l-2 transition-all hover:shadow-md relative ${
          selectedItem?.id === event.id ? 'ring-1 ring-white ring-offset-1' : ''
        } ${isCompleted ? 'opacity-70' : ''}`}
        style={{ 
          backgroundColor,
          borderLeftColor: borderColor
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isGoogleEvent) {
            window.open(event.html_link, '_blank');
          } else {
            onClick(event);
          }
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!isGoogleEvent) {
            onRightClick(e, event);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isGoogleEvent && (
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" className="w-3 h-3 flex-shrink-0" />
          )}
          {(isTaskEvent || isTask) && (
            <div className="flex-shrink-0">
              {isCompleted ? 
                <CheckCircle2 className="w-3 h-3" /> : 
                <ListTodo className="w-3 h-3" />
              }
            </div>
          )}
          <span className={`truncate flex-1 font-medium ${isCompleted ? 'line-through' : ''}`}>
            {event.title}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-xs opacity-90 mt-1">
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            <span>
              {event.start_time && format(new Date(event.start_time), preferences?.time_format === '24' ? 'HH:mm' : 'h:mm a')}
              {event.end_time && event.start_time !== event.end_time && 
                ` - ${format(new Date(event.end_time), preferences?.time_format === '24' ? 'HH:mm' : 'h:mm a')}`
              }
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate max-w-20">{event.location}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header - Fixed height */}
      <div className="p-6 border-b border-border/20 bg-muted/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className={`text-2xl font-bold ${
            isCurrentDay ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
          }`}>
            {format(currentDate, "EEEE, MMMM d")}
          </h2>
          {isCurrentDay && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
              Today
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {allItems.length} {allItems.length === 1 ? 'item' : 'items'} scheduled
        </p>
      </div>

      {/* Calendar content - Takes remaining space */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="flex h-full min-h-full">
          {/* Time slots column - Fixed width */}
          <div className="w-20 flex-shrink-0 border-r border-border/20 bg-muted/30">
            {timeSlots.map((hour) => (
              <div key={hour} className="h-20 flex items-start justify-end pr-3 pt-2 border-b border-border/10"> 
                <span className="text-xs font-medium text-muted-foreground/80">
                  {formatTime(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Events column - Takes remaining space */}
          <div className="flex-1">
            {timeSlots.map((hour) => {
              const hourItems = allItems.filter(item => {
                if (!item.start_time) return false;
                return new Date(item.start_time).getHours() === hour;
              });
              
              return (
                <div 
                  key={hour} 
                  className="h-20 p-3 border-b border-border/10 hover:bg-accent/30 transition-colors cursor-pointer w-full border-r border-border/10 last:border-r-0" 
                  onClick={(e) => {
                    if (e.target === e.currentTarget && handleCreateEvent) {
                      const clickTime = new Date(currentDate);
                      clickTime.setHours(hour, 0, 0, 0);
                      handleCreateEvent(clickTime);
                    }
                  }}
                > 
                  <div className="space-y-1 w-full h-full overflow-hidden"> 
                    <AnimatePresence>
                      {hourItems.map((item) => (
                        <EventBubble 
                          key={`${item.isTask ? 'task' : 'event'}-${item.id}`} 
                          event={item} 
                          onClick={onItemClick} 
                          onRightClick={onRightClick} 
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {allItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No events or tasks scheduled for this day.</p>
              <p>Click on a time slot to add something new!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}