import { timelit } from "@/api/timelitClient";

export class TaskScheduler {
  constructor(events, tasks, preferences) {
    this.events = events || [];
    this.tasks = tasks || [];
    this.preferences = preferences || {};
    this.now = new Date();
  }

  // 🎯 INTELLIGENT SLOT SCORING - Find the MOST SUITABLE slot
  scoreSlot(slot, task, date) {
    let score = 100; // Start with perfect score
    
    const slotHour = slot.start.getHours();
    const slotMinutes = slot.start.getMinutes();
    const slotTimeDecimal = slotHour + (slotMinutes / 60);
    
    const priority = task.priority || 'medium';
    const category = task.category || 'personal';
    const duration = task.duration || 60;

    // ⭐ PRIORITY WEIGHT: Urgent tasks get better slots
    const priorityWeights = { urgent: 40, high: 25, medium: 10, low: 0 };
    score += priorityWeights[priority] || 0;

    // 🌅 MORNING PREFERENCE
    if (this.preferences.prefer_morning_tasks) {
      if (slotTimeDecimal >= 8 && slotTimeDecimal < 12) {
        score += 30; // Strong bonus for morning
      } else if (slotTimeDecimal >= 12 && slotTimeDecimal < 14) {
        score += 10; // Small bonus for early afternoon
      } else {
        score -= 20; // Penalty for afternoon/evening
      }
    }

    // 🌆 AFTERNOON PREFERENCE
    if (this.preferences.prefer_afternoon_tasks) {
      if (slotTimeDecimal >= 14 && slotTimeDecimal < 18) {
        score += 30; // Strong bonus for afternoon
      } else if (slotTimeDecimal >= 12 && slotTimeDecimal < 14) {
        score += 10; // Small bonus for early afternoon
      } else {
        score -= 20; // Penalty for morning/evening
      }
    }

    // 🎯 TASK TYPE MATCHING TO TIME OF DAY
    const categoryTimePreferences = {
      work: { morning: 25, afternoon: 20, evening: -15 },
      learning: { morning: 30, afternoon: 15, evening: -10 },
      health: { morning: 35, afternoon: 10, evening: 0 },
      errands: { morning: 10, afternoon: 25, evening: 5 },
      personal: { morning: 15, afternoon: 15, evening: 10 },
      finance: { morning: 20, afternoon: 25, evening: -10 },
      home: { morning: 5, afternoon: 20, evening: 15 },
    };

    const timePref = categoryTimePreferences[category] || categoryTimePreferences.personal;
    
    if (slotTimeDecimal >= 6 && slotTimeDecimal < 12) {
      score += timePref.morning;
    } else if (slotTimeDecimal >= 12 && slotTimeDecimal < 17) {
      score += timePref.afternoon;
    } else {
      score += timePref.evening;
    }

    // ⏰ OPTIMAL ENERGY TIMES
    // Peak productivity hours: 10-12am, 3-5pm
    if ((slotTimeDecimal >= 10 && slotTimeDecimal < 12) || 
        (slotTimeDecimal >= 15 && slotTimeDecimal < 17)) {
      score += 25; // Peak energy bonus
    }

    // Low energy times: before 8am, after 7pm, 12-2pm (lunch dip)
    if (slotTimeDecimal < 8 || slotTimeDecimal > 19 || 
        (slotTimeDecimal >= 12 && slotTimeDecimal < 14)) {
      score -= 15; // Low energy penalty
    }

    // 🚀 URGENCY BONUS: Urgent tasks get earlier slots
    if (priority === 'urgent') {
      const hoursSinceNow = (slot.start - this.now) / (1000 * 60 * 60);
      if (hoursSinceNow < 4) {
        score += 50; // Huge bonus for very soon
      } else if (hoursSinceNow < 8) {
        score += 30; // Good bonus for today
      }
    }

    // 📅 DUE DATE PROXIMITY: Schedule closer to due date for non-urgent tasks
    if (task.due_date && priority !== 'urgent') {
      const dueDate = new Date(task.due_date);
      const daysUntilDue = (dueDate - slot.start) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 1) {
        score += 40; // High priority for tasks due soon
      } else if (daysUntilDue < 2) {
        score += 20;
      } else if (daysUntilDue < 3) {
        score += 10;
      }
    }

    // ⚖️ WORKLOAD BALANCE: Prefer less busy days
    const dayEvents = this.events.filter(e => {
      try {
        const eventDate = new Date(e.start_time);
        return eventDate.toDateString() === date.toDateString();
      } catch {
        return false;
      }
    });

    const dayBusyness = dayEvents.length;
    if (dayBusyness < 3) {
      score += 15; // Bonus for less busy days
    } else if (dayBusyness > 6) {
      score -= 20; // Penalty for very busy days
    }

    // 🔄 AVOID TASK CLUSTERING: Penalize if many tasks already nearby
    const nearbyTasks = this.events.filter(e => {
      if (!e.task_id) return false;
      try {
        const eventStart = new Date(e.start_time);
        const timeDiff = Math.abs(eventStart - slot.start) / (1000 * 60); // Minutes
        return timeDiff < 120; // Within 2 hours
      } catch {
        return false;
      }
    });

    if (nearbyTasks.length > 2) {
      score -= 25; // Penalty for clustering
    }

    // ⏳ DURATION FIT: Prefer slots that are well-suited for task duration
    const slotDuration = slot.duration;
    const durationFit = slotDuration / duration;
    
    if (durationFit >= 1 && durationFit <= 1.5) {
      score += 15; // Perfect fit
    } else if (durationFit > 1.5 && durationFit <= 2) {
      score += 5; // Decent fit
    } else if (durationFit < 1) {
      score -= 30; // Too small
    }

    // 🎯 WEEKEND HANDLING
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend && !this.preferences.weekend_work_enabled) {
      score -= 100; // Strong penalty for weekends if disabled
    } else if (isWeekend && category === 'work') {
      score -= 30; // Mild penalty for work on weekends
    }

    return Math.max(0, score); // Never go negative
  }

  // 🎯 SMART TASK SCHEDULING
  scheduleTask(task) {
    try {
      if (!task || task.status === 'done' || task.status === 'wont_do') {
        return { success: false, reason: 'Task not schedulable' };
      }

      const duration = task.duration || 60;
      const breakDuration = this.preferences.break_duration_between_tasks || 15;

      // Get scheduling window
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDate = task.due_date ? new Date(task.due_date) : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const searchEnd = new Date(Math.min(dueDate.getTime(), today.getTime() + 14 * 24 * 60 * 60 * 1000));

      // Get work hours - use flexible mode if custom times are set
      let workStart, workEnd;
      if (this.preferences.schedule_mode === 'school') {
        [workStart, workEnd] = [
          this.preferences.school_start_time || '08:00',
          this.preferences.school_end_time || '15:00'
        ];
      } else if (this.preferences.schedule_mode === 'flexible' ||
                 (this.preferences.work_start_time && this.preferences.work_end_time)) {
        [workStart, workEnd] = [
          this.preferences.work_start_time || '09:00',
          this.preferences.work_end_time || '17:00'
        ];
      } else {
        [workStart, workEnd] = [
          this.preferences.work_start_time || '09:00',
          this.preferences.work_end_time || '17:00'
        ];
      }

      const [startHour, startMin] = workStart.split(':').map(Number);
      const [endHour, endMin] = workEnd.split(':').map(Number);

      // Find ALL available slots and score them
      const availableSlots = [];
      let searchDate = new Date();
      searchDate.setHours(0, 0, 0, 0);

      while (searchDate <= searchEnd && availableSlots.length < 100) {
        const dayOfWeek = searchDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend && !this.preferences.weekend_work_enabled) {
          searchDate.setDate(searchDate.getDate() + 1);
          continue;
        }

        const dayStart = new Date(searchDate);
        dayStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(searchDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        if (dayStart < this.now) {
          const roundedNow = new Date(this.now);
          const minutes = roundedNow.getMinutes();
          roundedNow.setMinutes(Math.ceil(minutes / 30) * 30, 0, 0);
          dayStart.setTime(Math.max(dayStart.getTime(), roundedNow.getTime()));
        }

        const dayEvents = this.events
          .filter(e => {
            try {
              const eventStart = new Date(e.start_time);
              return eventStart.toDateString() === searchDate.toDateString();
            } catch {
              return false;
            }
          })
          .map(e => ({
            start: new Date(e.start_time),
            end: new Date(e.end_time)
          }))
          .sort((a, b) => a.start - b.start);

        // Add lunch break if enabled
        if (this.preferences.lunch_break_enabled) {
          const [lunchHour, lunchMin] = (this.preferences.lunch_break_start || '12:00').split(':').map(Number);
          const lunchStart = new Date(searchDate);
          lunchStart.setHours(lunchHour, lunchMin, 0, 0);
          const lunchEnd = new Date(lunchStart.getTime() + (this.preferences.lunch_break_duration || 60) * 60 * 1000);
          
          dayEvents.push({ start: lunchStart, end: lunchEnd, isLunch: true });
          dayEvents.sort((a, b) => a.start - b.start);
        }

        let currentTime = new Date(dayStart);

        for (const event of dayEvents) {
          const gapDuration = (event.start - currentTime) / (1000 * 60);
          
          if (gapDuration >= duration + 5) {
            const slotEnd = new Date(Math.min(event.start.getTime(), currentTime.getTime() + (duration + breakDuration) * 60 * 1000));
            
            availableSlots.push({
              start: new Date(currentTime),
              end: slotEnd,
              duration: gapDuration,
              date: new Date(searchDate)
            });
          }

          currentTime = new Date(Math.max(currentTime.getTime(), event.end.getTime() + breakDuration * 60 * 1000));
        }

        const finalGapDuration = (dayEnd - currentTime) / (1000 * 60);
        if (finalGapDuration >= duration + 5) {
          const slotEnd = new Date(Math.min(dayEnd.getTime(), currentTime.getTime() + (duration + breakDuration) * 60 * 1000));
          
          availableSlots.push({
            start: new Date(currentTime),
            end: slotEnd,
            duration: finalGapDuration,
            date: new Date(searchDate)
          });
        }

        searchDate.setDate(searchDate.getDate() + 1);
      }

      if (availableSlots.length === 0) {
        return {
          success: false,
          reason: 'No available time slots found'
        };
      }

      // 🎯 SCORE ALL SLOTS AND PICK THE BEST ONE
      const scoredSlots = availableSlots.map(slot => ({
        ...slot,
        score: this.scoreSlot(slot, task, slot.date)
      }));

      // Sort by score (highest first)
      scoredSlots.sort((a, b) => b.score - a.score);

      // Pick the best slot
      const bestSlot = scoredSlots[0];

      const eventEnd = new Date(bestSlot.start.getTime() + duration * 60 * 1000);

      return {
        success: true,
        newEvents: [{
          title: task.title,
          description: task.description,
          start_time: bestSlot.start.toISOString(),
          end_time: eventEnd.toISOString(),
          task_id: task.id,
          category: task.category || this.preferences.default_event_category || 'personal',
          priority: task.priority || 'medium',
          color: task.color || '#8b5cf6',
          ai_suggested: true,
        }],
        taskUpdate: {
          scheduled_start_time: bestSlot.start.toISOString(),
          scheduled_end_time: eventEnd.toISOString(),
          scheduled_date: bestSlot.start.toISOString().split('T')[0],
          auto_scheduled: true,
        },
        slotScore: bestSlot.score,
        reason: `Scheduled at optimal time (score: ${Math.round(bestSlot.score)})`
      };

    } catch (error) {
      console.error('Task scheduling error:', error);
      return {
        success: false,
        reason: error.message || 'Scheduling failed'
      };
    }
  }
}