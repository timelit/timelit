import React, { createContext, useContext, useState } from 'react';
import { startOfToday } from 'date-fns';

const CalendarDateContext = createContext({
  currentDate: new Date(),
  setCurrentDate: () => {},
});

export function CalendarDateProvider({ children }) {
  const [currentDate, setCurrentDate] = useState(startOfToday());

  return (
    <CalendarDateContext.Provider value={{ currentDate, setCurrentDate }}>
      {children}
    </CalendarDateContext.Provider>
  );
}

export const useCalendarDate = () => {
  const context = useContext(CalendarDateContext);
  if (!context) {
    throw new Error('useCalendarDate must be used within CalendarDateProvider');
  }
  return context;
};