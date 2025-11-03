import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, isSunday, isSaturday } from 'date-fns';
import EventItem from './EventItem';
import { Droppable, Draggable } from "@hello-pangea/dnd";

export default function WeekView({ currentDate, items, onItemClick, onDateClick, selectedItem, preferences }) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const allDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const days = preferences?.weekend_visible === false
    ? allDays.filter(day => !isSunday(day) && !isSaturday(day))
    : allDays;

  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const getGridColsClass = () => {
    switch(days.length) {
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      case 7: return 'grid-cols-7';
      default: return 'grid-cols-7';
    }
  };

  const getItemsForDay = (day) => {
    return items
      .filter(item => isSameDay(new Date(item.type === 'event' ? item.start_time : item.due_date), day))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const formatTime = (hour) => {
    const timeFormat = preferences?.time_format || '12';
    if (timeFormat === '24') return `${String(hour).padStart(2, '0')}:00`;
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getEventStyle = (item) => {
    const startTime = new Date(item.start_time);
    const endTime = new Date(item.end_time);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    const topPosition = startHour * 80;
    const height = Math.max((endHour - startHour) * 80 - 2, 40);
    return { position: 'absolute', top: `${topPosition}px`, height: `${height}px`, left: '2px', right: '2px', zIndex: 10 };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex border-b border-border bg-card/50 sticky top-0 z-30">
        <div className="w-24 flex-shrink-0 border-r border-border"></div>
        <div className={`flex-1 grid ${getGridColsClass()}`}>
          {days.map(day => (
            <div key={day.toISOString()} className={`p-3 text-center border-r border-border ${isToday(day) ? 'bg-primary/10' : ''}`}>
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{format(day, 'EEE')}</div>
              <div className={`text-2xl font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative">
          {/* Time column */}
          <div className="w-24 flex-shrink-0 border-r border-border bg-card/30">
            {timeSlots.map(hour => (
              <div key={hour} className="h-20 flex items-start justify-end pr-3 pt-1 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">{formatTime(hour)}</span>
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className={`flex-1 grid ${getGridColsClass()} relative`}>
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const events = dayItems.filter(item => item.type === 'event');
              const tasks = dayItems.filter(item => item.type === 'task');

              return (
                <div key={day.toISOString()} className="border-r border-border relative">
                  {/* Task Area at the top */}
                  <Droppable droppableId={`task-${day.toISOString()}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-1 space-y-1 min-h-[40px] sticky top-0 bg-background/80 backdrop-blur-sm z-20 ${snapshot.isDraggingOver ? 'bg-accent' : ''}`}
                      >
                        {tasks.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <EventItem item={item} onClick={onItemClick} isSelected={selectedItem?.id === item.id} variant="compact" preferences={preferences} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Main Timeline Area for Events */}
                  <Droppable droppableId={`event-${day.toISOString()}`}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="relative h-full">
                        {/* Drop zones for each hour */}
                        {timeSlots.map(hour => (
                          <div
                            key={hour}
                            className="h-20 border-b border-border/30"
                            style={{ position: 'absolute', top: `${hour * 80}px`, left: 0, right: 0 }}
                            onClick={() => {
                              const clickDate = new Date(day);
                              clickDate.setHours(hour, 0, 0, 0);
                              onDateClick(clickDate);
                            }}
                          />
                        ))}
                        {/* Render Draggable Events */}
                        {events.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={tasks.length + index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{ ...getEventStyle(item), ...provided.draggableProps.style, zIndex: snapshot.isDragging ? 1000 : 20 + index }}
                                onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                              >
                                <EventItem item={item} isSelected={selectedItem?.id === item.id} variant="week" preferences={preferences} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {/* Placeholder must be inside the droppable */}
                        <div style={{ display: "none" }}>{provided.placeholder}</div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}