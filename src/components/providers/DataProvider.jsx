import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Event } from "@/api/entities";
import { Task } from "@/api/entities";
import { TaskList } from "@/api/entities";
import { TaskTag } from "@/api/entities";
import { timelit } from "@/api/timelitClient";
import { SmartTaskScheduler } from '../scheduling/SmartTaskScheduler';
import { toast } from "sonner";
import { notificationManager } from "../notifications/NotificationManager";

// Undo Manager
class UndoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = 50;
  }

  addAction(action) {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return null;
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    return action;
  }

  redo() {
    if (!this.canRedo()) return null;
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    return action;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

const undoManager = new UndoManager();

const DataContext = createContext({
  events: [],
  setEvents: () => {},
  tasks: [],
  isLoading: true,
  isDataLoading: false,
  error: null,
  refreshData: () => {},
  addEvent: () => {},
  bulkAddEvents: () => {},
  updateEvent: () => {},
  deleteEvent: () => {},
  deleteEventSeries: () => {},
  addTask: () => {},
  updateTask: () => {},
  deleteTask: () => {},
  regenerateSchedule: () => {},
  categorizationProgress: { completed: 0, total: 0, isActive: false },
  triggerCategorization: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
});

class OptimizedCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.pendingRequests = new Map();
  }

  async get(key, fetchFn, ttl = 180000) { // Reduced to 3 min for faster updates
    const now = Date.now();
    const cached = this.cache.get(key);
    const timestamp = this.timestamps.get(key);

    if (cached && timestamp && (now - timestamp) < ttl) {
      return cached;
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fetchFn()
      .then(data => {
        this.cache.set(key, data);
        this.timestamps.set(key, now);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        if (cached) {
          return cached;
        }
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.timestamps.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.timestamps.clear();
    }
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.pendingRequests.clear();
  }
}

const cache = new OptimizedCache();

// Normalize server task shape -> UI task shape
function normalizeTask(t) {
  if (!t) return t;
  const id = t.id || t._id;
  const status =
    t.status ||
    (typeof t.completed === "boolean" ? (t.completed ? "done" : "todo") : undefined);
  const due_date =
    t.due_date || (t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null);
  const list_id = t.list_id ?? t.listId ?? null;
  const tag_ids = t.tag_ids ?? t.tags ?? [];
  const created_date =
    t.created_date || (t.createdAt ? new Date(t.createdAt).toISOString() : undefined);

  return {
    ...t,
    id,
    status: status || "todo",
    due_date,
    list_id,
    tag_ids,
    created_date: created_date || new Date().toISOString(),
  };
}

const taskCategoryColors = {
  work: '#3b82f6', personal: '#8b5cf6', learning: '#10b981',
  health: '#ef4444', home: '#f59e0b', errands: '#6366f1', finance: '#ec4899'
};
const taskCategories = Object.keys(taskCategoryColors);

// ⚡ FAST KEYWORD-BASED CATEGORIZATION (Instant UI feedback)
const fastCategorize = (item, itemType, userPreferences) => {
  const text = `${item.title || ''} ${item.description || ''} ${item.location || ''}`.toLowerCase();
  
  if (itemType === 'event') {
    const eventCategories = userPreferences?.event_categories || [
      {name: "work", color: "#3b82f6"},
      {name: "personal", color: "#8b5cf6"},
      {name: "meeting", color: "#ec4899"},
      {name: "appointment", color: "#10b981"},
      {name: "reminder", color: "#f59e0b"},
      {name: "travel", color: "#6366f1"},
      {name: "social", color: "#ef4444"}
    ];
    
    const categoryKeywords = {
      meeting: [
        'meeting', 'standup', '1:1', 'sync', 'scrum', 'call', 'zoom', 'teams', 'conference', 'discussion',
        'briefing', 'kickoff', 'retrospective', 'retro', 'planning', 'review', 'check-in', 'catchup',
        'workshop', 'seminar', 'webinar', 'training session', 'huddle', 'townhall', 'all-hands',
        'interview', 'demo', 'presentation', 'pitch', 'brainstorm', 'strategy session', 'quarterly review',
        'performance review', 'onboarding', 'offboarding', 'exit interview', 'video call', 'phone call',
        'client call', 'team meeting', 'board meeting', 'committee meeting', 'council meeting'
      ],
      
      appointment: [
        'doctor', 'dentist', 'clinic', 'hospital', 'appointment', 'checkup', 'therapy', 'salon',
        'consultation', 'medical', 'dental', 'physical', 'exam', 'screening', 'vaccination', 'vaccine',
        'surgery', 'procedure', 'treatment', 'lab work', 'blood test', 'x-ray', 'mri', 'ct scan',
        'optometrist', 'eye exam', 'dermatologist', 'psychiatrist', 'psychologist', 'counseling',
        'chiropractor', 'physiotherapy', 'massage', 'acupuncture', 'haircut', 'barber', 'spa',
        'manicure', 'pedicure', 'facial', 'waxing', 'vet', 'veterinarian', 'pet appointment',
        'lawyer', 'attorney', 'legal consultation', 'notary', 'accountant', 'tax prep',
        'financial advisor', 'bank appointment', 'mortgage', 'insurance', 'real estate',
        'home inspection', 'contractor', 'repair service', 'technician visit', 'maintenance',
        'dmv', 'government office', 'permit', 'license renewal', 'visa appointment', 'passport'
      ],
      
      travel: [
        'flight', 'hotel', 'trip', 'vacation', 'travel', 'airport', 'train', 'bus', 'car rental',
        'departure', 'arrival', 'layover', 'booking', 'reservation', 'check-in', 'checkout',
        'boarding', 'cruise', 'ferry', 'taxi', 'uber', 'lyft', 'shuttle', 'transfer',
        'roadtrip', 'road trip', 'journey', 'tour', 'excursion', 'sightseeing', 'holiday',
        'getaway', 'weekend trip', 'business trip', 'conference travel', 'convention',
        'hostel', 'airbnb', 'accommodation', 'lodging', 'stay', 'resort', 'motel',
        'camping', 'hiking trip', 'ski trip', 'beach trip', 'adventure', 'safari',
        'passport control', 'customs', 'immigration', 'visa', 'border crossing',
        'rental car', 'car hire', 'train station', 'subway', 'metro', 'public transport'
      ],
      
      social: [
        'party', 'dinner', 'hangout', 'coffee', 'lunch', 'brunch', 'drinks', 'birthday', 'celebration',
        'wedding', 'anniversary', 'engagement', 'baby shower', 'bridal shower', 'bachelor party',
        'bachelorette party', 'reunion', 'gathering', 'get-together', 'meetup', 'date', 'date night',
        'concert', 'show', 'movie', 'theatre', 'theater', 'festival', 'fair', 'carnival',
        'game night', 'trivia', 'karaoke', 'bowling', 'sports event', 'match', 'game',
        'barbecue', 'bbq', 'picnic', 'potluck', 'cookout', 'happy hour', 'cocktails',
        'nightclub', 'club', 'bar', 'pub', 'restaurant', 'dining', 'eating out',
        'family time', 'family dinner', 'family gathering', 'friends', 'social hour',
        'networking', 'mixer', 'reception', 'gala', 'fundraiser', 'charity event',
        'graduation', 'ceremony', 'recital', 'performance', 'exhibition', 'opening'
      ],
      
      reminder: [
        'deadline', 'submit', 'pay', 'reminder', 'due', 'bill', 'renew', 'payment',
        'subscription', 'membership', 'insurance premium', 'rent', 'mortgage payment',
        'credit card', 'utility bill', 'electricity', 'water bill', 'internet bill',
        'phone bill', 'car payment', 'loan payment', 'tax deadline', 'filing',
        'application deadline', 'registration', 'enrollment', 'signup', 'renewal',
        'expire', 'expiration', 'expiry', 'overdue', 'follow-up', 'follow up',
        'send email', 'call back', 'return call', 'respond to', 'reply to',
        'check on', 'verify', 'confirm', 'book', 'schedule', 'arrange',
        'order', 'purchase', 'buy', 'pick up', 'drop off', 'return',
        'reminder to', 'dont forget', "don't forget", 'remember to', 'make sure'
      ],
      
      work: [
        'project', 'presentation', 'report', 'work', 'office', 'client', 'deadline', 'task',
        'deliverable', 'milestone', 'sprint', 'release', 'launch', 'deployment', 'build',
        'code review', 'pull request', 'merge', 'testing', 'qa', 'bug fix', 'debugging',
        'development', 'design', 'mockup', 'wireframe', 'prototype', 'research',
        'analysis', 'documentation', 'writing', 'editing', 'proofreading', 'audit',
        'inspection', 'assessment', 'evaluation', 'proposal', 'contract', 'agreement',
        'negotiation', 'sales call', 'cold call', 'follow-up call', 'prospecting',
        'lead generation', 'customer service', 'support ticket', 'helpdesk',
        'training', 'onboard', 'orientation', 'learning', 'course', 'certification',
        'email', 'correspondence', 'memo', 'announcement', 'notification',
        'schedule', 'planning', 'coordination', 'organization', 'management',
        'supervision', 'oversight', 'leadership', 'executive', 'administrative',
        'paperwork', 'filing', 'records', 'data entry', 'processing', 'invoicing',
        'payroll', 'hr', 'human resources', 'recruitment', 'hiring', 'staffing',
        'budget', 'financial', 'accounting', 'bookkeeping', 'expense', 'procurement'
      ],
    };
    
    // Check categories in order of specificity (most specific first)
    const categoryOrder = ['appointment', 'meeting', 'travel', 'social', 'reminder', 'work'];
    
    for (const category of categoryOrder) {
      const keywords = categoryKeywords[category];
      if (keywords.some(keyword => text.includes(keyword))) {
        const categoryColor = eventCategories.find(c => c.name === category)?.color || '#8b5cf6';
        return { category, color: categoryColor, confidence: 'keyword' };
      }
    }
    
    const personalColor = eventCategories.find(c => c.name === 'personal')?.color || '#8b5cf6';
    return { category: 'personal', color: personalColor, confidence: 'keyword' };
  } else {
    // Task categorization
    const categoryKeywords = {
      learning: [
        'homework', 'study', 'course', 'learn', 'read', 'book', 'tutorial', 'practice', 'lesson',
        'assignment', 'essay', 'paper', 'research', 'thesis', 'dissertation', 'project',
        'exam', 'test', 'quiz', 'midterm', 'final', 'review', 'notes', 'flashcards',
        'lecture', 'class', 'seminar', 'workshop', 'webinar', 'online course', 'udemy',
        'coursera', 'edx', 'skillshare', 'masterclass', 'certificate', 'degree',
        'education', 'training', 'skill', 'language', 'coding', 'programming',
        'math', 'science', 'history', 'literature', 'subject', 'chapter', 'module',
        'textbook', 'article', 'journal', 'publication', 'documentation', 'manual'
      ],
      
      health: [
        'gym', 'workout', 'doctor', 'medicine', 'exercise', 'health', 'fitness', 'run', 'yoga',
        'cardio', 'strength', 'training', 'weights', 'lifting', 'crossfit', 'hiit',
        'walk', 'jog', 'running', 'marathon', 'race', 'cycling', 'bike', 'swimming',
        'pilates', 'stretching', 'meditation', 'mindfulness', 'breathing', 'relaxation',
        'therapy', 'physical therapy', 'rehab', 'recovery', 'injury', 'pain',
        'nutrition', 'diet', 'meal prep', 'healthy eating', 'calories', 'protein',
        'vitamins', 'supplements', 'water', 'hydration', 'sleep', 'rest',
        'mental health', 'stress', 'anxiety', 'depression', 'counseling', 'therapy',
        'appointment', 'checkup', 'prescription', 'refill', 'pharmacy', 'medication',
        'dental', 'dentist', 'teeth', 'cleaning', 'floss', 'brush',
        'sports', 'game', 'match', 'practice', 'training session', 'competition'
      ],
      
      home: [
        'clean', 'laundry', 'dishes', 'repair', 'maintenance', 'house', 'organize', 'fix',
        'vacuum', 'mop', 'sweep', 'dust', 'wipe', 'scrub', 'wash', 'tidy',
        'declutter', 'sort', 'fold', 'iron', 'put away', 'storage', 'closet',
        'kitchen', 'bathroom', 'bedroom', 'living room', 'garage', 'basement', 'attic',
        'yard', 'garden', 'lawn', 'mow', 'trim', 'prune', 'weed', 'plant', 'water',
        'trash', 'garbage', 'recycling', 'compost', 'bins', 'disposal',
        'plumbing', 'leak', 'drain', 'faucet', 'toilet', 'sink', 'shower',
        'electrical', 'outlet', 'switch', 'light', 'bulb', 'fixture', 'wiring',
        'hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'thermostat',
        'appliance', 'refrigerator', 'oven', 'stove', 'dishwasher', 'washer', 'dryer',
        'paint', 'painting', 'drywall', 'carpentry', 'flooring', 'carpet', 'tile',
        'renovation', 'remodel', 'upgrade', 'improvement', 'installation', 'assembly',
        'furniture', 'shelf', 'table', 'chair', 'bed', 'couch', 'cabinet',
        'window', 'door', 'lock', 'security', 'alarm', 'camera', 'doorbell'
      ],
      
      errands: [
        'grocery', 'shopping', 'buy', 'pick up', 'store', 'purchase', 'get',
        'supermarket', 'market', 'shop', 'mall', 'outlet', 'retail', 'boutique',
        'groceries', 'food', 'produce', 'meat', 'dairy', 'bakery', 'deli',
        'pharmacy', 'drugstore', 'prescription', 'medication', 'vitamins',
        'post office', 'mail', 'package', 'shipping', 'delivery', 'ups', 'fedex', 'usps',
        'bank', 'atm', 'deposit', 'withdraw', 'cash', 'check', 'transfer',
        'dry cleaning', 'laundromat', 'tailor', 'alterations', 'seamstress',
        'hardware store', 'supplies', 'materials', 'tools', 'equipment',
        'pet store', 'pet food', 'pet supplies', 'grooming', 'vet',
        'return', 'exchange', 'refund', 'customer service', 'complaint',
        'gas', 'fuel', 'gas station', 'fill up', 'car wash', 'oil change',
        'drop off', 'collect', 'retrieve', 'fetch', 'bring', 'take',
        'appointment', 'reservation', 'booking', 'schedule', 'arrange',
        'order', 'online order', 'amazon', 'delivery', 'curbside', 'pickup'
      ],
      
      finance: [
        'bill', 'payment', 'budget', 'invoice', 'tax', 'bank', 'pay',
        'taxes', 'irs', 'filing', 'return', 'deduction', 'refund', 'audit',
        'accounting', 'bookkeeping', 'ledger', 'reconcile', 'balance', 'statement',
        'credit card', 'debit card', 'visa', 'mastercard', 'amex', 'discover',
        'loan', 'mortgage', 'interest', 'principal', 'refinance', 'debt',
        'savings', 'checking', 'account', 'transfer', 'wire', 'ach', 'direct deposit',
        'investment', 'stock', 'portfolio', 'trading', 'broker', 'retirement', '401k', 'ira',
        'insurance', 'policy', 'premium', 'claim', 'coverage', 'deductible',
        'expense', 'cost', 'spending', 'purchase', 'transaction', 'receipt',
        'subscription', 'membership', 'renewal', 'cancel', 'upgrade', 'downgrade',
        'paycheck', 'salary', 'wage', 'income', 'earnings', 'bonus', 'commission',
        'reimbursement', 'refund', 'cashback', 'reward', 'points', 'miles',
        'financial', 'advisor', 'planner', 'consultation', 'review', 'planning',
        'credit score', 'credit report', 'fico', 'freeze', 'fraud', 'dispute'
      ],
      
      work: [
        'project', 'meeting', 'deadline', 'work', 'office', 'client', 'email', 'presentation',
        'report', 'document', 'spreadsheet', 'analysis', 'data', 'research',
        'task', 'ticket', 'issue', 'bug', 'feature', 'request', 'requirement',
        'deliverable', 'milestone', 'sprint', 'agile', 'scrum', 'kanban',
        'call', 'conference', 'zoom', 'teams', 'slack', 'video call',
        'review', 'feedback', 'approval', 'sign-off', 'approval', 'authorization',
        'planning', 'strategy', 'roadmap', 'timeline', 'schedule', 'coordination',
        'proposal', 'bid', 'quote', 'estimate', 'contract', 'agreement',
        'sales', 'marketing', 'campaign', 'advertising', 'promotion', 'launch',
        'code', 'programming', 'development', 'testing', 'deployment', 'release',
        'design', 'mockup', 'wireframe', 'prototype', 'ux', 'ui', 'branding',
        'training', 'onboarding', 'orientation', 'workshop', 'seminar',
        'hr', 'hiring', 'interview', 'recruitment', 'candidate', 'resume',
        'performance', 'evaluation', 'appraisal', 'feedback', 'goal', 'objective'
      ],
    };
    
    // Check categories in order of specificity
    const categoryOrder = ['learning', 'health', 'finance', 'errands', 'home', 'work'];
    
    for (const category of categoryOrder) {
      const keywords = categoryKeywords[category];
      if (keywords.some(keyword => text.includes(keyword))) {
        return { category, color: taskCategoryColors[category] || '#8b5cf6', confidence: 'keyword' };
      }
    }
    
    return { category: 'personal', color: '#8b5cf6', confidence: 'keyword' };
  }
};

// 🤖 LLM VERIFICATION (Background refinement) - DISABLED: API not implemented
const llmVerifyCategory = async (item, itemType, keywordResult, userPreferences) => {
  // Return keyword result directly since LLM API is not available
  return { ...keywordResult, confidence: 'keyword-only', changed: false };
};

const batchCategorize = async (itemsToProcess, updateEventFn, updateTaskFn, bulkAddEventsFn, userId, userPreferences) => {
  if (!itemsToProcess || itemsToProcess.length === 0 || !userId) return 0;

  let totalProcessed = 0; // Counts items whose category was updated by keyword matching

  // Process each item
  for (const item of itemsToProcess) {
    try {
      // STEP 1: ⚡ INSTANT keyword categorization
      const keywordResult = fastCategorize(item, item.itemType, userPreferences);
      
      // Apply keyword result immediately (optimistic update)
      let wasKeywordUpdated = false;
      if (item.itemType === 'event') {
        // Only update if a new category/color is determined and different from current
        if (item.category !== keywordResult.category || item.color !== keywordResult.color) {
          await updateEventFn(item.id, { category: keywordResult.category, color: keywordResult.color });
          wasKeywordUpdated = true;
        }
      } else { // item.itemType === 'task'
        if (item.category !== keywordResult.category || item.color !== keywordResult.color) {
          await updateTaskFn(item.id, { category: keywordResult.category, color: keywordResult.color });
          wasKeywordUpdated = true;
        }
      }

      if (wasKeywordUpdated) {
        totalProcessed++; // Count successful initial categorization by keywords
      }

      // STEP 2: 🤖 LLM verification in background (non-blocking)
      setTimeout(async () => {
        try {
          const llmResult = await llmVerifyCategory(item, item.itemType, keywordResult, userPreferences);
          
          // Only update if LLM suggests a different category that is also different from the current
          // state (important for optimistic updates)
          if (llmResult.changed) {
            // Re-fetch the item's current state to avoid overwriting newer changes
            const currentItem = item.itemType === 'event' 
              ? (await timelit.entities.Event.get(item.id)) 
              : (await timelit.entities.Task.get(item.id));

            if (currentItem && (currentItem.category !== llmResult.category || currentItem.color !== llmResult.color)) {
              if (item.itemType === 'event') {
                await updateEventFn(item.id, { category: llmResult.category, color: llmResult.color });
              } else {
                await updateTaskFn(item.id, { category: llmResult.category, color: llmResult.color });
              }
              console.log(`✨ LLM refined category for "${item.title}": ${keywordResult.category} → ${llmResult.category}`);
            }
          }
        } catch (error) {
          console.error(`Background LLM verification failed for "${item.title}":`, error);
        }
      }, 100); // Start LLM verification after 100ms
      
    } catch (error) {
      console.error(`Failed to categorize item ${item.id}:`, error);
    }
  }
  
  return totalProcessed;
};


export function DataProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [error, setError] = useState(null);
  const isLoading = isDataLoading;

  const [categorizationProgress, setCategorizationProgress] = useState({
    completed: 0,
    total: 0,
    isActive: false
  });

  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setRedoState] = useState(false);

  const dataLoadedRef = useRef(false);
  const addTaskInFlightRef = useRef(false);

  const updateUndoRedoStates = useCallback(() => {
    setCanUndoState(undoManager.canUndo());
    setRedoState(undoManager.canRedo());
  }, []);

  const loadAppData = useCallback(async (force = false) => {
    if (isDataLoading && !force) return;
    if (dataLoadedRef.current && !force) return;

    try {
      setIsDataLoading(true);
      setError(null);

      const [eventsResult, tasksResult] = await Promise.allSettled([
        cache.get(
          'events',
          () => Event.filter({}, "-start_time"),
          180000 // 3 min cache
        ),
        cache.get(
          'tasks',
          () => Task.filter({}, "-created_date"),
          180000 // 3 min cache
        ),
      ]);

      const localEvents = eventsResult.status === 'fulfilled' ? eventsResult.value || [] : [];
      const rawTasks = tasksResult.status === 'fulfilled' ? tasksResult.value || [] : [];
      const allTasks = rawTasks.map(normalizeTask);

      const taskIndex = new Map(allTasks.map(t => [t.id, t]));

      const processedEvents = localEvents.map(event => {
        if (event.task_id) {
          const linkedTask = taskIndex.get(event.task_id);
          if (linkedTask) {
            const titlePrefix = linkedTask.status === "done" ? "✓ " : "";
            return {
              ...event,
              title: titlePrefix + linkedTask.title,
              task_status: linkedTask.status,
              task_priority: linkedTask.priority,
              category: linkedTask.category || event.category,
              color: linkedTask.color || event.color,
            };
          }
        }
        return event;
      });

      // Add task-scheduled events to the events list
      const taskScheduledEvents = allTasks
        .filter(task => task.scheduled_start_time && task.status !== 'done' && task.status !== 'wont_do')
        .map(task => ({
          id: `task-${task.id}`,
          title: task.title,
          start_time: task.scheduled_start_time,
          end_time: new Date(new Date(task.scheduled_start_time).getTime() + (task.duration || 60) * 60 * 1000).toISOString(),
          category: task.category,
          color: task.color,
          priority: task.priority,
          task_id: task.id,
          task_status: task.status,
          task_priority: task.priority,
          isTaskEvent: true,
          description: task.description,
        }));

      const allEvents = [...processedEvents, ...taskScheduledEvents];

      // ✅ IMPORTANT: Clear and set fresh state
      setEvents(allEvents);
      setTasks(allTasks);

      dataLoadedRef.current = true;

      console.log(`✅ Loaded ${allEvents.length} events and ${allTasks.length} tasks`);

    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    cache.invalidate('events');
    cache.invalidate('tasks');
    dataLoadedRef.current = false;
    await loadAppData(true);
  }, [loadAppData]);

  const updateEvent = useCallback(async (eventId, updates) => {
    const originalEvent = events.find(e => e.id === eventId);

    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));

    try {
      timelit.entities.Event.update(eventId, updates).then(() => {
        cache.invalidate('events');
      }).catch(err => {
        console.error('Background update event failed:', err);
        setEvents(prev => prev.map(e => e.id === eventId ? originalEvent : e));
      });

      if (originalEvent) {
        undoManager.addAction({
          type: 'EVENT_UPDATE',
          data: {
            id: eventId,
            previous: originalEvent,
            updates: updates
          }
        });
        updateUndoRedoStates();
      }
    } catch (error) {
      setEvents(prev => prev.map(e => e.id === eventId ? originalEvent : e));
      throw error;
    }
  }, [events, updateUndoRedoStates]);

  const updateTask = useCallback(async (taskId, updates) => {
    const originalTask = tasks.find(t => t.id === taskId);

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    setEvents(prev => prev.map(event => {
      if (event.task_id === taskId) {
        const updatedTitle = updates.status === "done"
          ? `✓ ${updates.title || event.title}`.replace(/^✓\s*/, '✓ ')
          : (updates.title || event.title).replace(/^✓\s*/, '');
        return {
          ...event,
          title: updatedTitle,
          task_status: updates.status || event.task_status,
          category: updates.category || event.category,
          color: updates.color || event.color,
        };
      }
      return event;
    }));

    // Update task-scheduled events when task changes
    setEvents(prev => prev.filter(event => !event.isTaskEvent || event.task_id !== taskId));
    const updatedTask = { ...originalTask, ...updates };
    if (updatedTask.scheduled_start_time && updatedTask.status !== 'done' && updatedTask.status !== 'wont_do') {
      const taskEvent = {
        id: `task-${taskId}`,
        title: updatedTask.title,
        start_time: updatedTask.scheduled_start_time,
        end_time: new Date(new Date(updatedTask.scheduled_start_time).getTime() + (updatedTask.duration || 60) * 60 * 1000).toISOString(),
        category: updatedTask.category,
        color: updatedTask.color,
        priority: updatedTask.priority,
        task_id: taskId,
        task_status: updatedTask.status,
        task_priority: updatedTask.priority,
        isTaskEvent: true,
        description: updatedTask.description,
      };
      setEvents(prev => [...prev, taskEvent]);
    }

    try {
      timelit.entities.Task.update(taskId, updates).then(() => {
        cache.invalidate('tasks');
      }).catch(err => {
        console.error('Background update task failed:', err);
        if (originalTask) {
          setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
          setEvents(prev => prev.map(event => {
            if (event.task_id === taskId) {
              const originalTitle = originalTask.status === 'done'
                ? `✓ ${originalTask.title}`
                : originalTask.title;
              return {
                ...event,
                title: originalTitle,
                task_status: originalTask.status,
                category: originalTask.category,
                color: originalTask.color,
              };
            }
            return event;
          }));
        }
      });

      if (updates.category !== undefined || updates.color !== undefined) {
        const linkedEvents = events.filter(e => e.task_id === taskId);
        if (linkedEvents.length > 0) {
          Promise.all(
            linkedEvents.map(event =>
              timelit.entities.Event.update(event.id, {
                category: updates.category !== undefined ? updates.category : event.category,
                color: updates.color !== undefined ? updates.color : event.color
              })
            )
          ).then(() => {
            cache.invalidate('events');
          }).catch(err => {
            console.error('Background update linked events failed:', err);
          });
        }
      }

      if (originalTask) {
        undoManager.addAction({
          type: 'TASK_UPDATE',
          data: {
            id: taskId,
            previous: originalTask,
            updates: updates
          }
        });
        updateUndoRedoStates();
      }
    } catch (error) {
      if (originalTask) {
        setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
        setEvents(prev => prev.map(event => {
          if (event.task_id === taskId) {
            const originalTitle = originalTask.status === 'done'
              ? `✓ ${originalTask.title}`
              : originalTask.title;
            return {
              ...event,
              title: originalTitle,
              task_status: originalTask.status,
              category: originalTask.category,
              color: originalTask.color,
            };
          }
          return event;
        }));
      }
      throw error;
    }
  }, [tasks, events, updateUndoRedoStates]);

  const bulkAddEvents = useCallback(async (eventDataArray) => {
    if (!eventDataArray || eventDataArray.length === 0) return [];

    const tempEvents = eventDataArray.map(eventData => ({
      ...eventData,
      id: `temp-bulk-${Math.random()}-${Date.now()}`
    }));

    setEvents(prev => [...tempEvents, ...prev]);

    try {
      const newEvents = await timelit.entities.Event.bulkCreate(eventDataArray);
      const tempIds = new Set(tempEvents.map(te => te.id));
      setEvents(prev => [...newEvents, ...prev.filter(e => !tempIds.has(e.id))]);
      cache.invalidate('events');
      return newEvents;
    } catch (error) {
      const tempIds = new Set(tempEvents.map(te => te.id));
      setEvents(prev => prev.filter(e => !tempIds.has(e.id)));
      throw error;
    }
  }, []);

  const addEvent = useCallback(async (eventData) => {
    const tempId = `temp-${Date.now()}`;

    const categorizedResult = fastCategorize(eventData, 'event', null);

    const finalEventData = {
      ...eventData,
      start_time: typeof eventData.start_time === 'string' ? eventData.start_time : eventData.start_time?.toISOString(),
      end_time: typeof eventData.end_time === 'string' ? eventData.end_time : eventData.end_time?.toISOString(),
      category: eventData.category || categorizedResult.category || 'personal',
      priority: eventData.priority || 'medium',
      color: eventData.color || categorizedResult.color || '#8b5cf6',
    };

    const tempEvent = { ...finalEventData, id: tempId };

    // Add temp event immediately for UI feedback
    setEvents(prev => [tempEvent, ...prev]);

    try {
      const newEvent = await timelit.entities.Event.create(finalEventData);

      console.log('✅ Event created:', newEvent);

      // Replace temp event with real event from server
      setEvents(prev => {
        const filtered = prev.filter(e => e.id !== tempId);
        return [newEvent, ...filtered];
      });

      // Invalidate cache to trigger refetch if needed
      cache.invalidate('events');

      undoManager.addAction({
        type: 'EVENT_CREATE',
        data: newEvent
      });
      updateUndoRedoStates();

      toast.success('Event added!');
      return newEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      toast.error('Failed to add event');
      throw error;
    }
  }, [updateUndoRedoStates]);

  const addTask = useCallback(async (taskData) => {
    if (addTaskInFlightRef.current) {
      return;
    }
    addTaskInFlightRef.current = true;

    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const categorizedResult = fastCategorize(taskData, 'task', null);

    const finalTaskData = {
      ...taskData,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      duration: taskData.duration || 60,
      category: taskData.category || categorizedResult.category || 'personal',
      color: taskData.color || categorizedResult.color || '#8b5cf6',
      tags: taskData.tags || [],
    };

    // Safeguard: If task has no due date, default to today or within next 3 days
    if (!finalTaskData.due_date) {
      const today = new Date();
      const randomDays = Math.floor(Math.random() * 3); // 0-2 days
      const defaultDate = new Date(today);
      defaultDate.setDate(today.getDate() + randomDays);
      finalTaskData.due_date = defaultDate.toISOString().split('T')[0];
    }

    const tempTask = { ...finalTaskData, id: tempId, created_date: new Date().toISOString() };

    setTasks(prev => [tempTask, ...prev]);

    try {
      const createdTask = await timelit.entities.Task.create(finalTaskData);
      const normalized = normalizeTask(createdTask);

      console.log('✅ Task created:', normalized);
      console.log('(a) Task created → Task added to local state');

      // Replace temp task with real task from server
      setTasks(prev => {
        const filtered = prev.filter(t => t.id !== tempId);
        return [normalized, ...filtered];
      });

      cache.invalidate('tasks');

      undoManager.addAction({
        type: 'TASK_CREATE',
        data: normalized
      });
      updateUndoRedoStates();

      toast.success('Task added!');

      // Auto-schedule task into calendar if enabled
      if (preferences?.auto_schedule_tasks_into_calendar) {
        setTimeout(async () => {
          try {
            // Use the current tasks state plus the newly created task
            const currentTasks = await Task.filter({}, "-created_date");
            const allTasks = currentTasks.map(normalizeTask);
            const scheduler = new SmartTaskScheduler(events, allTasks, preferences);
            const result = scheduler.scheduleTask(normalized);

            if (result?.success && result.newEvents?.length > 0) {
              const scheduledEvent = result.newEvents[0];
              await addEvent(scheduledEvent);
              console.log('(b) Task added to calendar data → Calendar re-renders');
              console.log('✅ Task auto-scheduled:', scheduledEvent);
              await updateTask(normalized.id, result.taskUpdate);
            } else {
              console.log('⚠️ Task not auto-scheduled - no suitable time found');
            }
          } catch (error) {
            console.error("Auto-scheduling error:", error);
          }
        }, 100);
      }

      addTaskInFlightRef.current = false;
      return normalized;
    } catch (error) {
      console.error('Failed to create task:', error);
      setTasks(prev => prev.filter(t => t.id !== tempId));
      addTaskInFlightRef.current = false;
      toast.error('Failed to add task');
      throw error;
    }
  }, [updateUndoRedoStates]);

  const triggerCategorization = useCallback(async () => {
    if (categorizationProgress.isActive) {
      return;
    }

    // Only categorize items that don't have a category yet
    const allUncategorizedEvents = events.filter(e => !e.category).map(e => ({ ...e, itemType: 'event' }));
    const allUncategorizedTasks = tasks.filter(t => !t.category).map(t => ({ ...t, itemType: 'task' }));
    const allUncategorized = [...allUncategorizedEvents, ...allUncategorizedTasks];

    if (allUncategorized.length === 0) {
      toast.info("All items already categorized!");
      return;
    }

    setCategorizationProgress({ completed: 0, total: allUncategorized.length, isActive: true });
    toast.info(`Starting organization for ${allUncategorized.length} items...`);

    try {
      const processedCount = await batchCategorize(allUncategorized, updateEvent, updateTask, bulkAddEvents, null, null);
      setCategorizationProgress({ completed: processedCount, total: allUncategorized.length, isActive: false });

      if (processedCount > 0) {
        toast.success(`Organization complete! ${processedCount} items initially categorized.`);
        // Refresh data to ensure UI is fully consistent, especially if some updates were delayed or failed silently.
        await refreshData();
      } else {
        toast.info("No items were categorized or all were already categorized.");
      }
    } catch (error) {
      console.error(`Failed to categorize items:`, error);
      toast.error("Failed to complete categorization.");
      setCategorizationProgress({ completed: 0, total: 0, isActive: false });
    }

  }, [events, tasks, updateEvent, updateTask, bulkAddEvents, categorizationProgress.isActive, refreshData]);

  const deleteEvent = useCallback(async (eventId) => {
    const eventToDelete = events.find(e => e.id === eventId);
    let deletedTask = null;

    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (eventToDelete?.task_id) {
      deletedTask = tasks.find(t => t.id === eventToDelete.task_id);
      setTasks(prev => prev.filter(t => t.id !== eventToDelete.task_id));
    }

    try {
      Event.delete(eventId).then(() => {
        cache.invalidate('events');
      }).catch(err => {
        console.error("Background Event deletion failed:", err);
        setEvents(prev => eventToDelete ? [eventToDelete, ...prev] : prev);
      });

      if (deletedTask) {
        Task.delete(deletedTask.id).then(() => {
          cache.invalidate('tasks');
        }).catch(err => {
          console.error("Background Task deletion failed (linked to event):", err);
          setTasks(prev => [deletedTask, ...prev]);
        });
      }

      undoManager.addAction({
        type: 'EVENT_DELETE',
        data: {
          event: eventToDelete,
          task: deletedTask
        }
      });
      updateUndoRedoStates();
    } catch (error) {
      setEvents(prev => eventToDelete ? [eventToDelete, ...prev] : prev);
      if (deletedTask) {
        setTasks(prev => [deletedTask, ...prev]);
      }
      throw error;
    }
  }, [events, tasks, updateUndoRedoStates]);

  const deleteTask = useCallback(async (taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    const linkedEvents = events.filter(e => e.task_id === taskId);

    setTasks(prev => prev.filter(t => t.id !== taskId));
    setEvents(prev => prev.filter(e => e.task_id !== taskId || e.isTaskEvent));

    try {
      Promise.all([
        ...linkedEvents.map(e => Event.delete(e.id)),
        Task.delete(taskId)
      ]).then(() => {
        cache.invalidate('tasks');
        cache.invalidate('events');
      }).catch(err => {
        console.error("Background Task/linked events deletion failed:", err);
        if (taskToDelete) setTasks(prev => [taskToDelete, ...prev]);
        setEvents(prev => [...linkedEvents, ...prev]);
      });

      undoManager.addAction({
        type: 'TASK_DELETE',
        data: {
          task: taskToDelete,
          linkedEvents: linkedEvents
        }
      });
      updateUndoRedoStates();
    } catch (error) {
      if (taskToDelete) setTasks(prev => [taskToDelete, ...prev]);
      setEvents(prev => [...linkedEvents, ...prev]);
      throw error;
    }
  }, [events, tasks, updateUndoRedoStates]);

  const deleteEventSeries = useCallback(async (groupId) => {
    if (!groupId) return;
    const seriesEvents = events.filter(e => e.recurring_group_id === groupId);
    setEvents(prev => prev.filter(e => e.recurring_group_id !== groupId));

    try {
      await Promise.all(seriesEvents.map(e => Event.delete(e.id)));
      cache.invalidate('events');
    } catch (error) {
      dataLoadedRef.current = false;
      await loadAppData(true);
      throw error;
    }
  }, [events, loadAppData]);

  const regenerateSchedule = useCallback(async () => {
    toast.info("Regenerating schedule...");

    try {
      const activeTasks = await Task.filter({ status: { '$ne': 'done' } });
      const currentEvents = await Event.filter({});

      const eventsToDelete = currentEvents.filter(e => e.ai_suggested || e.task_id);
      if (eventsToDelete.length > 0) {
        await Promise.all(eventsToDelete.map(e => Event.delete(e.id)));
      }

      const manualEvents = currentEvents.filter(e => !e.ai_suggested && !e.task_id);

      const scheduler = new SmartTaskScheduler(manualEvents, activeTasks, null);
      const allNewEvents = [];
      const allTaskUpdates = [];

      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const sortedTasks = [...activeTasks].sort((a, b) =>
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );

      for (const task of sortedTasks) {
        const result = scheduler.scheduleTask(task);
        if (result.success) {
          const scheduledEventsWithTaskInfo = result.newEvents.map(e => ({
            ...e,
            category: task.category || e.category,
            color: task.color || e.color
          }));
          allNewEvents.push(...scheduledEventsWithTaskInfo);
          allTaskUpdates.push({ taskId: task.id, ...result.taskUpdate });
          scheduler.events.push(...scheduledEventsWithTaskInfo);
        }
      }

      const eventsForBulkCreate = allNewEvents;

      if (eventsForBulkCreate.length > 0) {
        await Event.bulkCreate(eventsForBulkCreate);
      }
      if (allTaskUpdates.length > 0) {
        await Promise.all(allTaskUpdates.map(update => Task.update(update.taskId, update)));
      }

      await refreshData();
      toast.success("Schedule regenerated!");

    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error("Failed to regenerate schedule");
    }
  }, [refreshData]);

  const undo = useCallback(async () => {
    const action = undoManager.undo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'EVENT_CREATE':
          setEvents(prev => prev.filter(e => e.id !== action.data.id));
          Event.delete(action.data.id).then(() => {
            cache.invalidate('events');
          });
          break;

        case 'EVENT_UPDATE':
          setEvents(prev => prev.map(e => e.id === action.data.id ? action.data.previous : e));
          Event.update(action.data.id, action.data.previous).then(() => {
            cache.invalidate('events');
          });
          break;

        case 'EVENT_DELETE':
          setEvents(prev => [action.data.event, ...prev]);
          if (action.data.task) {
            setTasks(prev => [action.data.task, ...prev]);
          }
          Event.create(action.data.event).then((restoredEvent) => {
            setEvents(prev => prev.map(e => e.id === action.data.event.id ? restoredEvent : e));
            cache.invalidate('events');

            if (action.data.task) {
              Task.create(action.data.task).then((restoredTask) => {
                setTasks(prev => prev.map(t => t.id === action.data.task.id ? restoredTask : t));
                cache.invalidate('tasks');
                if (action.data.event.task_id && restoredTask.id !== action.data.task.id) {
                    Event.update(restoredEvent.id, { task_id: restoredTask.id });
                    setEvents(prev => prev.map(e => e.id === restoredEvent.id ? { ...e, task_id: restoredTask.id } : e));
                }
              });
            }
          });
          break;

        case 'TASK_CREATE':
          setTasks(prev => prev.filter(t => t.id !== action.data.id));
          setEvents(prev => prev.filter(event => !event.isTaskEvent || event.task_id !== action.data.id));
          Task.delete(action.data.id).then(() => {
            cache.invalidate('tasks');
          });
          break;

        case 'TASK_UPDATE':
          setTasks(prev => prev.map(t => t.id === action.data.id ? action.data.previous : t));
          setEvents(prev => prev.map(event => {
            if (event.task_id === action.data.id) {
              const originalTitle = (action.data.previous.status === 'done'
                ? `✓ ${action.data.previous.title}`
                : action.data.previous.title
              );
              return {
                ...event,
                title: originalTitle,
                task_status: action.data.previous.status,
                category: action.data.previous.category || event.category,
                color: action.data.previous.color || event.color
              };
            }
            return event;
          }));
          // Restore task-scheduled event to previous state
          setEvents(prev => prev.filter(event => !event.isTaskEvent || event.task_id !== action.data.id));
          if (action.data.previous.scheduled_start_time && action.data.previous.status !== 'done') {
            const taskEvent = {
              id: `task-${action.data.id}`,
              title: action.data.previous.title,
              start_time: action.data.previous.scheduled_start_time,
              end_time: new Date(new Date(action.data.previous.scheduled_start_time).getTime() + (action.data.previous.duration || 60) * 60 * 1000).toISOString(),
              category: action.data.previous.category,
              color: action.data.previous.color,
              priority: action.data.previous.priority,
              task_id: action.data.id,
              task_status: action.data.previous.status,
              task_priority: action.data.previous.priority,
              isTaskEvent: true,
              description: action.data.previous.description,
            };
            setEvents(prev => [...prev, taskEvent]);
          }
          Task.update(action.data.id, action.data.previous).then(() => {
            cache.invalidate('tasks');
          });
          break;

        case 'TASK_DELETE':
          setTasks(prev => [action.data.task, ...prev]);
          if (action.data.linkedEvents && action.data.linkedEvents.length > 0) {
            setEvents(prev => [...action.data.linkedEvents, ...prev]);
          }
          // Restore task-scheduled event if task was scheduled
          if (action.data.task.scheduled_start_time && action.data.task.status !== 'done') {
            const taskEvent = {
              id: `task-${action.data.task.id}`,
              title: action.data.task.title,
              start_time: action.data.task.scheduled_start_time,
              end_time: new Date(new Date(action.data.task.scheduled_start_time).getTime() + (action.data.task.duration || 60) * 60 * 1000).toISOString(),
              category: action.data.task.category,
              color: action.data.task.color,
              priority: action.data.task.priority,
              task_id: action.data.task.id,
              task_status: action.data.task.status,
              task_priority: action.data.task.priority,
              isTaskEvent: true,
              description: action.data.task.description,
            };
            setEvents(prev => [...prev, taskEvent]);
          }
          Task.create(action.data.task).then((restoredTask) => {
            setTasks(prev => prev.map(t => t.id === action.data.task.id ? restoredTask : t));
            cache.invalidate('tasks');

            if (action.data.linkedEvents && action.data.linkedEvents.length > 0) {
              Promise.all(
                action.data.linkedEvents.map(event =>
                  Event.create({ ...event, task_id: restoredTask.id })
                )
              ).then((restoredEvents) => {
                setEvents(prev => {
                  const filtered = prev.filter(e => !action.data.linkedEvents.some(le => le.id === e.id));
                  return [...restoredEvents, ...filtered];
                });
                cache.invalidate('events');
              });
            }
          });
          break;

        default:
          console.error("Unknown action type for undo:", action.type);
      }
    } catch (error) {
      console.error("Optimistic undo failed:", error);
      undoManager.undoStack.push(action);
      undoManager.redoStack.pop();
      refreshData();
    } finally {
      updateUndoRedoStates();
    }
  }, [events, tasks, refreshData, updateUndoRedoStates]);

  const redo = useCallback(async () => {
    const action = undoManager.redo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'EVENT_CREATE':
          setEvents(prev => [action.data, ...prev]);
          Event.create(action.data).then((recreatedEvent) => {
            setEvents(prev => prev.map(e => e.id === action.data.id ? recreatedEvent : e));
            cache.invalidate('events');
          });
          break;

        case 'EVENT_UPDATE':
          setEvents(prev => prev.map(e => e.id === action.data.id ? { ...e, ...action.data.updates } : e));
          Event.update(action.data.id, action.data.updates).then(() => {
            cache.invalidate('events');
          });
          break;

        case 'EVENT_DELETE':
          setEvents(prev => prev.filter(e => e.id !== action.data.event.id));
          if (action.data.task) {
            setTasks(prev => prev.filter(t => t.id !== action.data.task.id));
          }
          Event.delete(action.data.event.id).then(() => {
            cache.invalidate('events');
          });
          if (action.data.task) {
            Task.delete(action.data.task.id).then(() => {
              cache.invalidate('tasks');
            });
          }
          break;

        case 'TASK_CREATE':
          setTasks(prev => [action.data, ...prev]);
          // Restore task-scheduled event if task was scheduled
          if (action.data.scheduled_start_time && action.data.status !== 'done') {
            const taskEvent = {
              id: `task-${action.data.id}`,
              title: action.data.title,
              start_time: action.data.scheduled_start_time,
              end_time: new Date(new Date(action.data.scheduled_start_time).getTime() + (action.data.duration || 60) * 60 * 1000).toISOString(),
              category: action.data.category,
              color: action.data.color,
              priority: action.data.priority,
              task_id: action.data.id,
              task_status: action.data.status,
              task_priority: action.data.priority,
              isTaskEvent: true,
              description: action.data.description,
            };
            setEvents(prev => [...prev, taskEvent]);
          }
          Task.create(action.data).then((recreatedTask) => {
            setTasks(prev => prev.map(t => t.id === action.data.id ? recreatedTask : t));
            cache.invalidate('tasks');
          });
          break;

        case 'TASK_UPDATE':
          setTasks(prev => prev.map(t => t.id === action.data.id ? { ...t, ...action.data.updates } : t));
          setEvents(prev => prev.map(event => {
            if (event.task_id === action.data.id) {
              const updatedTitle = (action.data.updates.status === 'done'
                ? `✓ ${action.data.updates.title || event.title}`
                : (action.data.updates.title || event.title)
              ).replace(/^✓\s*/, action.data.updates.status === 'done' ? '✓ ' : '');
              return {
                ...event,
                title: updatedTitle,
                task_status: action.data.updates.status || event.task_status,
                category: action.data.updates.category || event.category,
                color: action.data.updates.color || event.color
              };
            }
            return event;
          }));
          Task.update(action.data.id, action.data.updates).then(() => {
            cache.invalidate('tasks');
          });
          break;

        case 'TASK_DELETE':
          setTasks(prev => prev.filter(t => t.id !== action.data.task.id));
          if (action.data.linkedEvents && action.data.linkedEvents.length > 0) {
            setEvents(prev => prev.filter(e => !action.data.linkedEvents.some(le => le.id === e.id)));
          }
          Task.delete(action.data.task.id).then(() => {
            cache.invalidate('tasks');
          });
          if (action.data.linkedEvents && action.data.linkedEvents.length > 0) {
            Promise.all(
              action.data.linkedEvents.map(event => Event.delete(event.id))
            ).then(() => {
                cache.invalidate('events');
            });
          }
          break;

        default:
          console.error("Unknown action type for redo:", action.type);
      }
    } catch (error) {
      console.error("Optimistic redo failed:", error);
      undoManager.redoStack.push(action);
      undoManager.undoStack.pop();
      refreshData();
    } finally {
      updateUndoRedoStates();
    }
  }, [events, tasks, refreshData, updateUndoRedoStates]);

  useEffect(() => {
    if (!dataLoadedRef.current) loadAppData();
  }, [loadAppData]);

  useEffect(() => {
    if (isDataLoading || categorizationProgress.isActive) return;

    const hasUncategorizedEvents = events.some(e => !e.category);
    const hasUncategorizedTasks = tasks.some(t => !t.category);

    // Only trigger if there are uncategorized items
    if (hasUncategorizedEvents || hasUncategorizedTasks) {
      const handler = setTimeout(() => {
        triggerCategorization();
      }, 500); // Debounce to prevent immediate categorization on every data load/change
      return () => clearTimeout(handler);
    }
  }, [isDataLoading, events, tasks, triggerCategorization, categorizationProgress.isActive]);

  useEffect(() => {
    if (isDataLoading) return;

    // Enable notifications by default
    const notificationsEnabled = true;
    const browserPermissionGranted = notificationManager.getPermissionStatus() === 'granted';

    if (notificationsEnabled && browserPermissionGranted) {
      notificationManager.start();
      const allSchedulableItems = [
        ...events,
        ...tasks.filter(t => t.auto_scheduled && t.scheduled_start_time)
      ];
      notificationManager.updateItems(allSchedulableItems);
    } else {
      notificationManager.stop();
    }
  }, [isDataLoading, events, tasks]);

  const value = useMemo(() => ({
    events,
    setEvents,
    tasks,
    isLoading,
    isDataLoading,
    error,
    refreshData,
    addEvent,
    bulkAddEvents,
    updateEvent,
    deleteEvent,
    deleteEventSeries,
    addTask,
    updateTask,
    deleteTask,
    regenerateSchedule,
    categorizationProgress,
    triggerCategorization,
    undo,
    redo,
    canUndo: canUndoState,
    canRedo: canRedoState,
  }), [
    events, tasks, isLoading, isDataLoading, error,
    refreshData,
    addEvent, bulkAddEvents, updateEvent, deleteEvent, deleteEventSeries,
    addTask, updateTask, deleteTask, regenerateSchedule, categorizationProgress, triggerCategorization,
    undo, redo, canUndoState, canRedoState,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
