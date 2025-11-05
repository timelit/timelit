
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, CalendarDays, Calendar, List, Tag, CheckCircle2, Trash2, ChevronDown, ChevronRight, MoreHorizontal, ListTodo, X, Check, AlertCircle, CalendarX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useData } from "../components/providers/DataProvider";
import { timelit } from "@/api/timelitClient";
import TaskItem from "../components/tasks/TaskItem";
import { startOfToday, endOfToday, addDays, endOfDay, parseISO, isWithinInterval, isPast, isBefore } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; // NEW: Import Textarea

const TaskSidebarItem = ({ icon: Icon, label, count, isActive, onClick, color }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-sm
      ${isActive ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
    `}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" style={color && !isActive ? { color } : {}} />
      <span>{label}</span>
    </div>
    {count > 0 && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-neutral-800'}`}>
        {count}
      </span>
    )}
  </button>
);

export default function TasksPage() {
  // NEW: Added updatePreferences to useData destructuring
  const { user, tasks, isLoading, error, addTask, updateTask, deleteTask, preferences, updatePreferences } = useData();

  const [activeView, setActiveView] = useState('inbox');
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [listsExpanded, setListsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  
  const [lists, setLists] = useState([]);
  const [tags, setTags] = useState([]);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  // NEW: Selected tasks for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  // NEW: State for notes section
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  // Prevent same-tick double submit from Enter bubbling and form submit race
  const quickAddSubmittingRef = useRef(false);

  // NEW: Load notes from preferences on initial render
  useEffect(() => {
    if (preferences?.task_notes) {
      setNotes(preferences.task_notes);
    }
  }, [preferences]);

  // NEW: Auto-save notes with debouncing
  useEffect(() => {
    // Only save if notes has actually changed from the last known preference value.
    if (notes === (preferences?.task_notes || "")) {
      return;
    }
    
    setIsSavingNotes(true); // Indicate saving immediately
    const timeoutId = setTimeout(async () => {
      try {
        await updatePreferences({ task_notes: notes });
        // toast.success("Notes saved."); // Optional: Add a small toast for feedback
      } catch (error) {
        console.error("Failed to save notes:", error);
        toast.error("Failed to save notes");
      } finally {
        setIsSavingNotes(false); // Reset saving indicator
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => {
      clearTimeout(timeoutId); // Clear timeout if notes change again before debounce finishes
      // If component unmounts while saving, ensure saving indicator is off
      setIsSavingNotes(false); 
    };
  }, [notes, preferences?.task_notes, updatePreferences]); // Added preferences?.task_notes to avoid unnecessary saves if preferences object reference changes but content doesn't.

  // Load lists and tags
  useEffect(() => {
    const loadListsAndTags = async () => {
      if (!user) return;
      try {
        const [listsData, tagsData] = await Promise.all([
          timelit.entities.TaskList.filter({ created_by: user.email }),
          timelit.entities.TaskTag.filter({ created_by: user.email })
        ]);
        setLists(listsData || []);
        setTags(tagsData || []);
      } catch (err) {
        console.error("Error loading lists/tags:", err);
      }
    };
    loadListsAndTags();
  }, [user]);

  // Optimized filter tasks - REMOVED overdue and no_due_date cases
  const filteredTasks = useMemo(() => {
    const today = startOfToday();
    const todayEnd = endOfToday();
    const next7Days = endOfDay(addDays(today, 7));

    const filtered = tasks.filter(t => {
      if (activeView === 'completed') return t.status === 'done';
      if (t.status === 'done' || t.status === 'wont_do') return false;

      switch (activeView) {
        case 'today':
          if (!t.due_date) return false;
          const dueDate = parseISO(t.due_date);
          return isWithinInterval(dueDate, { start: today, end: todayEnd });
        
        case 'next7days':
          if (!t.due_date) return false;
          const dueDate7 = parseISO(t.due_date);
          return isWithinInterval(dueDate7, { start: today, end: next7Days });
        
        case 'list':
          return t.list_id === selectedListId;
        
        case 'tag':
          return t.tag_ids?.includes(selectedTagId);
        
        case 'inbox':
        default:
          return true;
      }
    });

    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    
    if (activeView === 'inbox') {
      return filtered.sort((a, b) => {
        // 1. Pinned tasks first
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        
        // 2. Manual order (for drag and drop)
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
          return a.order - b.order;
        }
        
        // 3. Most recently created first (NEW TASKS AT TOP)
        if (a.created_date && b.created_date) {
          const dateA = new Date(a.created_date).getTime();
          const dateB = new Date(b.created_date).getTime();
          if (dateA !== dateB) return dateB - dateA;
        }
        
        // 4. Priority as final tiebreaker
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });
    }

    return filtered.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.due_date && b.due_date) {
        const dateA = parseISO(a.due_date);
        const dateB = parseISO(b.due_date);

        const timeA = dateA.getTime();
        const timeB = dateB.getTime();

        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;

        return timeA - timeB;
      }
      
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }, [tasks, activeView, selectedListId, selectedTagId]);

  // Task counts - REMOVED overdue and no_due_date
  const taskCounts = useMemo(() => {
    const today = startOfToday();
    const todayEnd = endOfToday();
    const next7Days = endOfDay(addDays(today, 7));
    
    const counts = { inbox: 0, today: 0, next7days: 0, completed: 0 };
    
    for (const t of tasks) {
      if (t.status === 'done') {
        counts.completed++;
        continue;
      }
      
      if (t.status === 'wont_do') continue;
      
      counts.inbox++;
      
      if (t.due_date) {
        const dueDate = parseISO(t.due_date);
        if (isWithinInterval(dueDate, { start: today, end: todayEnd })) {
          counts.today++;
        }
        if (isWithinInterval(dueDate, { start: today, end: next7Days })) {
          counts.next7days++;
        }
      }
    }
    
    return counts;
  }, [tasks]);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    if (quickAddSubmittingRef.current || isAddingTask) return;

    quickAddSubmittingRef.current = true;
    setIsAddingTask(true);
    const titleToAdd = quickAddValue.trim();
    setQuickAddValue(""); // Clear immediately on submit

    const taskData = {
      title: titleToAdd,
      status: preferences?.default_task_status || "todo",
      priority: preferences?.default_task_priority || "medium",
      duration: 60,
    };

    if (activeView === 'list' && selectedListId) {
      taskData.list_id = selectedListId;
    }

    try {
      await addTask(taskData);
      toast.success("Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
      setQuickAddValue(titleToAdd); // Restore on error
    } finally {
      setIsAddingTask(false);
      quickAddSubmittingRef.current = false;
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const newList = await timelit.entities.TaskList.create({
        name: newListName,
        color: '#3b82f6',
        created_by: user.email
      });
      setLists([...lists, newList]);
      setNewListName("");
      setIsCreateListOpen(false);
      toast.success("List created");
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error("Failed to create list");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await timelit.entities.TaskTag.create({
        name: newTagName,
        color: '#8b5cf6',
        created_by: user.email
      });
      setTags([...tags, newTag]);
      setNewTagName("");
      setIsCreateTagOpen(false);
      toast.success("Tag created");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm("Are you sure you want to delete this list? Tasks associated with this list will NOT be deleted, but will become unassigned.")) return;
    try {
      await timelit.entities.TaskList.delete(listId);
      setLists(lists.filter(l => l.id !== listId));
      if (selectedListId === listId) {
        setActiveView('inbox');
        setSelectedListId(null);
      }
      toast.success("List deleted");
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error("Failed to delete list");
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (!window.confirm("Are you sure you want to delete this tag? Tasks associated with this tag will NOT be deleted, but will become untagged.")) return;
    try {
      await timelit.entities.TaskTag.delete(tagId);
      setTags(tags.filter(t => t.id !== tagId));
      if (selectedTagId === tagId) {
        setActiveView('inbox');
        setSelectedTagId(null);
      }
      toast.success("Tag deleted");
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Failed to delete tag");
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'today': 
        return { icon: CalendarDays, title: 'Today' };
      case 'next7days': 
        return { icon: Calendar, title: 'Next 7 Days' };
      case 'inbox': 
        return { icon: Inbox, title: 'Inbox' };
      case 'completed': 
        return { icon: CheckCircle2, title: 'Completed' };
      case 'list': {
        const list = lists.find(l => l.id === selectedListId);
        return { icon: List, title: list?.name || 'List' };
      }
      case 'tag': {
        const tag = tags.find(t => t.id === selectedTagId);
        return { icon: Tag, title: tag?.name || 'Tag' };
      }
      default: 
        return { icon: Inbox, title: 'Tasks' };
    }
  };

  const handleDragStart = (e, task) => {
    if (activeView !== 'inbox') {
      e.preventDefault();
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTask(null);
    setDragPosition(null);
  };

  const handleDragOver = (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTask || draggedTask.id === task.id || activeView !== 'inbox') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'above' : 'below';
    
    setDragOverTask(task);
    setDragPosition(position);
  };

  const handleDrop = async (e, targetTask) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTask || draggedTask.id === targetTask.id || activeView !== 'inbox') return;

    const draggedIndex = filteredTasks.findIndex(t => t.id === draggedTask.id);
    const targetIndex = filteredTasks.findIndex(t => t.id === targetTask.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTask(null);
      setDragOverTask(null);
      setDragPosition(null);
      return;
    }

    const reorderedTasks = [...filteredTasks];
    const [removed] = reorderedTasks.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex) insertIndex--;
    if (dragPosition === 'below') insertIndex++;
    insertIndex = Math.max(0, Math.min(insertIndex, reorderedTasks.length));

    reorderedTasks.splice(insertIndex, 0, removed);

    const updates = [];
    for (let i = 0; i < reorderedTasks.length; i++) {
      const task = reorderedTasks[i];
      if (task.order !== i) {
        updates.push(
          updateTask(task.id, { order: i }).catch(err => {
            console.error(`Failed to update task ${task.id}:`, err);
            return null;
          })
        );
      }
    }

    try {
      await Promise.allSettled(updates);
      toast.success("Task reordered");
    } catch (error) {
      console.error("Error reordering tasks:", error);
      toast.error("Failed to reorder task");
    } finally {
      setDraggedTask(null);
      setDragOverTask(null);
      setDragPosition(null);
    }
  };

  const handleCreateSubtask = async (parentTask) => {
    const subtaskData = {
      title: "New subtask",
      parent_task_id: parentTask.id,
      list_id: parentTask.list_id,
      priority: parentTask.priority,
      due_date: parentTask.due_date,
      status: preferences?.default_task_status || "todo",
    };
    
    try {
      await addTask(subtaskData);
      toast.success("Subtask created");
    } catch (error) {
      console.error("Error creating subtask:", error);
      toast.error("Failed to create subtask");
    }
  };

  // NEW: Bulk action handlers
  const handleTaskSelection = useCallback((taskId) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleBulkComplete = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(taskId => 
          updateTask(taskId, { status: 'done' })
        )
      );
      toast.success(`${selectedTaskIds.size} tasks completed`);
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error("Error completing tasks:", error);
      toast.error("Failed to complete tasks");
    }
  }, [selectedTaskIds, updateTask]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedTaskIds.size} tasks?`)) return;
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(taskId => deleteTask(taskId))
      );
      toast.success(`${selectedTaskIds.size} tasks deleted`);
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Failed to delete tasks");
    }
  }, [selectedTaskIds, deleteTask]);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-900">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-900">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  const viewInfo = getViewTitle();

  return (
    <div className="flex h-full bg-neutral-900">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 flex flex-col">
        <div className="p-4 space-y-2">
          <TaskSidebarItem
            icon={CalendarDays}
            label="Today"
            count={taskCounts.today}
            isActive={activeView === 'today'}
            onClick={() => {
              setActiveView('today');
              setSelectedListId(null);
              setSelectedTagId(null);
            }}
            color="#3b82f6"
          />
          <TaskSidebarItem
            icon={Calendar}
            label="Next 7 Days"
            count={taskCounts.next7days}
            isActive={activeView === 'next7days'}
            onClick={() => {
              setActiveView('next7days');
              setSelectedListId(null);
              setSelectedTagId(null);
            }}
            color="#8b5cf6"
          />
          <TaskSidebarItem
            icon={Inbox}
            label="Inbox"
            count={taskCounts.inbox}
            isActive={activeView === 'inbox'}
            onClick={() => {
              setActiveView('inbox');
              setSelectedListId(null);
              setSelectedTagId(null);
            }}
            color="#10b981"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {/* Lists Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setListsExpanded(!listsExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase hover:text-neutral-300"
              >
                {listsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Lists
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-500 hover:text-neutral-300"
                onClick={() => setIsCreateListOpen(true)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <AnimatePresence>
              {listsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1"
                >
                  {lists.map(list => (
                    <div key={list.id} className="group flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveView('list');
                          setSelectedListId(list.id);
                          setSelectedTagId(null);
                        }}
                        className={`
                          flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                          ${activeView === 'list' && selectedListId === list.id ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
                        `}
                      >
                        <List className="w-4 h-4" style={{ color: list.color }} />
                        <span className="flex-1 text-left truncate">{list.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800">
                          {tasks.filter(t => t.list_id === list.id && t.status !== 'done' && t.status !== 'wont_do').length}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDeleteList(list.id)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tags Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setTagsExpanded(!tagsExpanded)}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase hover:text-neutral-300"
              >
                {tagsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Tags
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-500 hover:text-neutral-300"
                onClick={() => setIsCreateTagOpen(true)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <AnimatePresence>
              {tagsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1"
                >
                  {tags.map(tag => (
                    <div key={tag.id} className="group flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveView('tag');
                          setSelectedTagId(tag.id);
                          setSelectedListId(null);
                        }}
                        className={`
                          flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                          ${activeView === 'tag' && selectedTagId === tag.id ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
                        `}
                      >
                        <Tag className="w-4 h-4" style={{ color: tag.color }} />
                        <span className="flex-1 text-left truncate">{tag.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800">
                          {tasks.filter(t => t.tag_ids?.includes(tag.id) && t.status !== 'done' && t.status !== 'wont_do').length}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDeleteTag(tag.id)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes Section - Moved right after Tags */}
          <div className="mb-4 pb-4 border-b border-neutral-800">
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                Notes
              </span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick notes..."
              className="min-h-[280px] max-h-[450px] bg-neutral-800/50 border border-neutral-700/50 text-neutral-200 text-xs placeholder:text-neutral-600 resize-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-neutral-700/50"
            />
          </div>

          {/* Category Legend */}
          {preferences?.event_categories && preferences.event_categories.length > 0 && (
            <div className="px-4 py-3 flex-shrink-0">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-2 tracking-wide">
                Categories
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {preferences?.event_categories?.map((category) => (
                  <div key={category.name} className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-[10px] text-neutral-400 capitalize truncate">
                      {category.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2 flex-shrink-0">
          <TaskSidebarItem
            icon={CheckCircle2}
            label="Completed"
            count={taskCounts.completed}
            isActive={activeView === 'completed'}
            onClick={() => {
              setActiveView('completed');
              setSelectedListId(null);
              setSelectedTagId(null);
            }}
            color="#10b981"
          />
        </div>
      </div>

      {/* Vertical Separator */}
      <div className="w-px bg-neutral-800" />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <viewInfo.icon className="w-7 h-7 text-neutral-400" />
            <div>
              <h1 className="text-2xl font-semibold text-neutral-100">{viewInfo.title}</h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <form onSubmit={handleQuickAdd} className="relative">
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Add a task..."
              className="w-full bg-neutral-800/50 border-neutral-700/50 text-base pl-10 h-12 rounded-lg hover:bg-neutral-800 hover:border-neutral-600/50 transition-all"
              autoComplete="off"
              disabled={isAddingTask}
            />
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          </form>
        </div>

        {/* NEW: Bulk Actions Bar */}
        <AnimatePresence>
          {selectedTaskIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-6 mb-4 px-4 py-3 bg-blue-600 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">
                  {selectedTaskIds.size} selected
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  Bulk Actions
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleBulkComplete}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleClearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task) => {
                const showDropIndicatorAbove = dragOverTask?.id === task.id && dragPosition === 'above' && activeView === 'inbox';
                const showDropIndicatorBelow = dragOverTask?.id === task.id && dragPosition === 'below' && activeView === 'inbox';
                
                return (
                  <React.Fragment key={task.id}>
                    {showDropIndicatorAbove && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0 }}
                        className="h-1 bg-blue-500 rounded-full mb-2 shadow-lg shadow-blue-500/50 origin-top"
                      />
                    )}
                    
                    <TaskItem
                      task={task}
                      onToggle={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                      onUpdate={updateTask}
                      onDelete={() => deleteTask(task.id)}
                      lists={lists}
                      tags={tags}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, task)}
                      onDrop={(e) => handleDrop(e, task)}
                      isDragging={draggedTask?.id === task.id}
                      onCreateSubtask={handleCreateSubtask}
                      allowDrag={activeView === 'inbox'}
                      isSelected={selectedTaskIds.has(task.id)}
                      onSelect={handleTaskSelection}
                      preferences={preferences}
                    />
                    
                    {showDropIndicatorBelow && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0 }}
                        className="h-1 bg-blue-500 rounded-full mt-2 mb-1 shadow-lg shadow-blue-500/50 origin-bottom"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4">
                <ListTodo className="w-8 h-8 text-neutral-600" />
              </div>
              <p className="text-lg font-medium text-neutral-400">No tasks found</p>
              <p className="text-sm text-neutral-500 mt-1">Create a new task to get started</p>
            </div>
          )}
        </div>

        <Button
          onClick={async () => {
            const newTaskData = {
              title: "New task",
              status: preferences?.default_task_status || "todo",
              priority: preferences?.default_task_priority || "medium",
              duration: 60,
            };
            
            if (activeView === 'list' && selectedListId) {
              newTaskData.list_id = selectedListId;
            }
            
            try {
              await addTask(newTaskData);
              toast.success("Task created");
            } catch (error) {
              console.error("Error adding task:", error);
              toast.error("Failed to add task");
            }
          }}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all z-30"
        >
          <Plus className="h-8 w-8 stroke-[2.5]" />
        </Button>
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="list-name" className="text-neutral-200">List Name</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Work Projects"
                className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateListOpen(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </Button>
            <Button onClick={handleCreateList} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tag-name" className="text-neutral-200">Tag Name</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., urgent"
                className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTagOpen(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </Button>
            <Button onClick={handleCreateTag} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
