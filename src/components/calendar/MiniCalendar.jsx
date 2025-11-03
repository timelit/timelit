import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday as dateFnsIsToday, isSameDay, addMonths, subMonths } from 'date-fns';

export default function MiniCalendar({ currentDate, onDateSelect }) {
  const [displayMonth, setDisplayMonth] = React.useState(new Date(currentDate));

  useEffect(() => {
    setDisplayMonth(new Date(currentDate));
  }, [currentDate]);

  const today = new Date();

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => setDisplayMonth(subMonths(displayMonth, 1));
  const goToNextMonth = () => setDisplayMonth(addMonths(displayMonth, 1));

  const handleDateClick = (day) => {
    if (onDateSelect) {
      onDateSelect(day);
    }
  };

  return (
    <div className="w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-neutral-800 rounded transition-colors"
        >
          <ChevronLeft className="w-3 h-3 text-neutral-400" />
        </button>
        <span className="text-xs font-semibold text-neutral-200">
          {format(displayMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-neutral-800 rounded transition-colors"
        >
          <ChevronRight className="w-3 h-3 text-neutral-400" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[9px] text-neutral-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isToday = dateFnsIsToday(day, today);
          const isSelected = isSameDay(day, currentDate);
          
          return (
            <button
              key={i}
              onClick={() => handleDateClick(day)}
              disabled={!isCurrentMonth}
              className={`
                aspect-square text-[10px] rounded-md transition-all flex items-center justify-center
                ${!isCurrentMonth ? 'text-neutral-600 cursor-default' : 'text-neutral-300 hover:bg-neutral-800'}
                ${isToday ? 'bg-blue-600 text-white hover:bg-blue-700 font-semibold' : ''}
                ${isSelected && !isToday ? 'bg-neutral-700 text-white font-medium' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}