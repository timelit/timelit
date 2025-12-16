
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, ListTodo, Settings, BarChart2, CalendarDays } from "lucide-react";
import { ThemeProvider, useTheme } from "../components/providers/ThemeProvider";
import { DataProvider } from "../components/providers/DataProvider";
import { CalendarDateProvider, useCalendarDate } from "../components/providers/CalendarDateProvider";
import UserNav from "../components/layout/UserNav";
import MiniCalendar from "../components/calendar/MiniCalendar";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import TimelitLogo from "../components/ui/TimelitLogo";

export const navigationItems = [
  { title: "Tasks", url: createPageUrl("Tasks"), icon: ListTodo },
  { title: "Calendar", url: createPageUrl("Calendar"), icon: Calendar },
  { title: "Scheduling", url: createPageUrl("Scheduling"), icon: CalendarDays },
  { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart2 },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { currentDate, setCurrentDate } = useCalendarDate();

  const handleDateSelect = (date) => {
    setCurrentDate(date);
    if (location.pathname !== createPageUrl("Calendar")) {
      navigate(createPageUrl("Calendar"));
    }
  };

  const isCalendarPage = currentPageName === "Calendar";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full bg-neutral-950 text-foreground overflow-hidden">
        <nav
          className="fixed left-0 top-0 z-40 flex h-full w-[240px] sm:w-[260px] xl:w-[280px] flex-col bg-neutral-900/95 backdrop-blur-sm overflow-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            nav::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          <div className="py-4 px-5 flex items-center justify-between flex-shrink-0">
            <Link to={createPageUrl("Calendar")} className="flex items-center gap-3">
              <TimelitLogo size={28} />
              <span className="text-lg font-semibold text-white">Timelit</span>
            </Link>
          </div>

          <div className="px-4 py-3 space-y-1 flex-shrink-0">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.title}</span> 
                </Link>
              );
            })}
          </div>

          <div className="px-4 py-2 flex-shrink-0">
            <MiniCalendar 
              currentDate={currentDate} 
              onDateSelect={handleDateSelect}
            />
          </div>

          <div className="px-4 py-2 flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {/* Calendar insights removed - was causing errors */}
          </div>

          <div className="mt-auto p-4 flex-shrink-0">
            <UserNav />
          </div>
        </nav>

        <main className="flex-1 flex flex-col overflow-hidden ml-[240px] sm:ml-[260px] xl:ml-[280px]">
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={`h-full ${isCalendarPage ? 'bg-neutral-950' : 'bg-neutral-900'}`}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="timelit-theme">
      <DataProvider>
        <CalendarDateProvider>
          <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
        </CalendarDateProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
