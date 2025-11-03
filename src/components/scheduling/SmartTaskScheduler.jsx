import { addMinutes, addHours, startOfDay, endOfDay, isWithinInterval, format, parseISO, isBefore, isAfter, addDays, isSameDay } from 'date-fns';

export class SmartTaskScheduler {
  constructor(existingEvents, allTasks, userPreferences) {
    this.existingEvents = existingEvents || [];
    this.allTasks = allTasks || [];
    this.prefs = userPreferences || {};
    
    // Parse schedule preferences
    this.scheduleMode = this.prefs.schedule_mode || 'work';
    this.dailyWorkHours = this.prefs.daily_work_hours || 8;
    this.dailyFocusHours = this.prefs.daily_focus_hours || 4;
    this.maxConsecutiveHours = this.prefs.max_consecutive_work_hours || 2;
    this.shortBreakDuration = this.prefs.short_break_duration || 15;
    this.longBreakDuration = this.prefs.long_break_duration || 30;
    this.breakFrequency = this.prefs.break_frequency || 'every_2_hours';
    this.lunchBreakEnabled = this.prefs.lunch_break_enabled !== false;
    this.lunchBreakStart = this.prefs.lunch_break_start || '12:00';
    this.lunchBreakDuration = this.prefs.lunch_break_duration || 60;
    this.avoidEarlyMeetings = this.prefs.avoid_early_meetings || false;
    this.avoidLateMeetings = this.prefs.avoid_late_meetings || false;
    this.preferMorningTasks = this.prefs.prefer_morning_tasks || false;
    this.meetingBufferTime = this.prefs.meeting_buffer_time || 10;
    
    // Working hours based on schedule mode
    if (this.scheduleMode === 'school') {
      this.workStartTime = this.prefs.school_start_time || '08:00';
      this.workEndTime = this.prefs.school_end_time || '15:00';
    } else {
      this.workStartTime = this.prefs.work_start_time || '09:00';
      this.workEndTime = this.prefs.work_end_time || '17:00';
    }
    
    // Energy peak hours
    this.peakStartTime = this.prefs.energy_peak_hours_start || '09:00';
    this.peakEndTime = this.prefs.energy_peak_hours_end || '11:00';
  }

  /**
   * Intelligently schedule a task avoiding all conflicts
   */
  scheduleTask(task, targetDate = new Date()) {
    try {
      const taskDuration = (task.duration || 60) / 60; // Convert to hours
      const startDate = startOfDay(targetDate);
      const endDate = endOfDay(targetDate);

      // Get all blocked time slots for this day
      const blockedSlots = this.getBlockedTimeSlots(targetDate);
      
      // Generate potential time slots based on preferences
      const potentialSlots = this.generatePotentialTimeSlots(targetDate, taskDuration);
      
      // Filter out slots that conflict with blocked time
      const availableSlots = potentialSlots.filter(slot => 
        !this.hasConflict(slot.start, slot.end, blockedSlots)
      );

      if (availableSlots.length === 0) {
        // Try next day if no slots available
        const nextDay = addDays(targetDate, 1);
        if (nextDay <= addDays(new Date(), 7)) { // Only try for next 7 days
          return this.scheduleTask(task, nextDay);
        }
        
        return {
          success: false,
          reason: "No available time slots found in the next 7 days"
        };
      }

      // Score and sort slots by preference
      const scoredSlots = availableSlots.map(slot => ({
        ...slot,
        score: this.scoreTimeSlot(slot, task)
      })).sort((a, b) => b.score - a.score);

      const bestSlot = scoredSlots[0];

      // Create the scheduled event
      const newEvents = [{
        title: task.title,
        description: task.description || `Scheduled: ${task.title}`,
        start_time: bestSlot.start.toISOString(),
        end_time: bestSlot.end.toISOString(),
        task_id: task.id,
        category: task.category || this.prefs.default_event_category || 'work',
        priority: task.priority || 'medium',
        ai_suggested: true
      }];

      // Add break after task if needed
      if (this.shouldAddBreakAfter(bestSlot)) {
        const breakStart = bestSlot.end;
        const breakEnd = addMinutes(breakStart, this.getBreakDuration(bestSlot));
        
        newEvents.push({
          title: 'Break',
          description: 'Scheduled break',
          start_time: breakStart.toISOString(),
          end_time: breakEnd.toISOString(),
          category: 'personal',
          priority: 'low',
          ai_suggested: true
        });
      }

      return {
        success: true,
        newEvents,
        taskUpdate: {
          scheduled_start_time: bestSlot.start.toISOString(),
          scheduled_end_time: bestSlot.end.toISOString(),
          scheduled_date: format(bestSlot.start, 'yyyy-MM-dd'),
          auto_scheduled: true
        }
      };

    } catch (error) {
      console.error('Error in scheduleTask:', error);
      return {
        success: false,
        reason: `Scheduling error: ${error.message}`
      };
    }
  }

  /**
   * Get all blocked time slots for a given day
   */
  getBlockedTimeSlots(date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const slots = [];

    // Add existing events (including Google Calendar events)
    this.existingEvents.forEach(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      if (isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
          isWithinInterval(eventEnd, { start: dayStart, end: dayEnd })) {
        
        // Add buffer time for meetings
        const bufferMinutes = event.category === 'meeting' ? this.meetingBufferTime : 5;
        
        slots.push({
          start: addMinutes(eventStart, -bufferMinutes),
          end: addMinutes(eventEnd, bufferMinutes),
          type: 'existing_event',
          title: event.title,
          isGoogleEvent: event.isGoogleEvent || false
        });
      }
    });

    // Add lunch break if enabled
    if (this.lunchBreakEnabled) {
      const [lunchHour, lunchMinute] = this.lunchBreakStart.split(':');
      const lunchStart = new Date(dayStart);
      lunchStart.setHours(parseInt(lunchHour), parseInt(lunchMinute), 0, 0);
      const lunchEnd = addMinutes(lunchStart, this.lunchBreakDuration);
      
      slots.push({
        start: lunchStart,
        end: lunchEnd,
        type: 'lunch_break',
        title: 'Lunch Break'
      });
    }

    // Add non-working hours
    const [startHour, startMinute] = this.workStartTime.split(':');
    const [endHour, endMinute] = this.workEndTime.split(':');
    
    const workStart = new Date(dayStart);
    workStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const workEnd = new Date(dayStart);
    workEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Block time before work hours
    if (workStart > dayStart) {
      slots.push({
        start: dayStart,
        end: workStart,
        type: 'non_work_hours',
        title: 'Before Work Hours'
      });
    }

    // Block time after work hours
    if (workEnd < dayEnd) {
      slots.push({
        start: workEnd,
        end: dayEnd,
        type: 'non_work_hours',
        title: 'After Work Hours'
      });
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Generate potential time slots for scheduling
   */
  generatePotentialTimeSlots(date, durationHours) {
    const slots = [];
    const dayStart = startOfDay(date);
    const [startHour, startMinute] = this.workStartTime.split(':');
    const [endHour, endMinute] = this.workEndTime.split(':');
    
    const workStart = new Date(dayStart);
    workStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const workEnd = new Date(dayStart);
    workEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Generate 30-minute intervals throughout work day
    let currentTime = new Date(workStart);
    const durationMs = durationHours * 60 * 60 * 1000;
    
    while (currentTime.getTime() + durationMs <= workEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + durationMs);
      
      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        duration: durationHours
      });
      
      // Move to next 30-minute interval
      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  }

  /**
   * Check if a time slot conflicts with blocked slots
   */
  hasConflict(slotStart, slotEnd, blockedSlots) {
    return blockedSlots.some(blocked => {
      // Check for any overlap
      return (slotStart < blocked.end && slotEnd > blocked.start);
    });
  }

  /**
   * Score a time slot based on user preferences
   */
  scoreTimeSlot(slot, task) {
    let score = 100; // Base score
    
    const slotHour = slot.start.getHours();
    const slotMinutes = slotHour + (slot.start.getMinutes() / 60);
    
    // Peak energy hours boost
    const [peakStartHour] = this.peakStartTime.split(':');
    const [peakEndHour] = this.peakEndTime.split(':');
    
    if (slotMinutes >= parseInt(peakStartHour) && slotMinutes <= parseInt(peakEndHour)) {
      score += 30;
    }

    // Morning preference for important tasks
    if (this.preferMorningTasks && (task.priority === 'high' || task.priority === 'urgent')) {
      if (slotHour >= 8 && slotHour <= 11) {
        score += 20;
      }
    }

    // Avoid very early or late scheduling based on preferences
    if (this.avoidEarlyMeetings && slotHour < 9) {
      score -= 20;
    }
    
    if (this.avoidLateMeetings && slotHour >= 16) {
      score -= 20;
    }

    // Priority-based scoring
    const priorityBoosts = { urgent: 25, high: 15, medium: 0, low: -10 };
    score += priorityBoosts[task.priority] || 0;

    // Prefer earlier slots for equal scores (helps with procrastination)
    score -= Math.floor(slotMinutes); // Small penalty for later times

    return score;
  }

  /**
   * Determine if a break should be added after this slot
   */
  shouldAddBreakAfter(slot) {
    if (this.breakFrequency === 'never') return false;
    
    // Simple heuristic: add break after work sessions longer than 1 hour
    return slot.duration >= 1;
  }

  /**
   * Get appropriate break duration
   */
  getBreakDuration(slot) {
    // Longer tasks get longer breaks
    if (slot.duration >= 2) {
      return this.longBreakDuration;
    }
    return this.shortBreakDuration;
  }
}

export default SmartTaskScheduler;