
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  Trash2, 
  Calendar as CalendarIcon, 
  Flag,
  ListPlus,
  Link as LinkIcon,
  Pin,
  XCircle,
  FolderInput,
  Tag as TagIcon,
  Copy,
  ExternalLink,
  Clock
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, isSameDay } from "date-fns";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useData } from "../providers/DataProvider";

const priorityColors = {
  low: "#3b82f6",
  medium: "#eab308",
  high: "#f97316",
  urgent: "#ef4444",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium", 
  high: "High",
  urgent: "Urgent"
};

export default function TaskItem({ 
  task, 
  onToggle, 
  onUpdate, 
  onDelete, 
  lists, 
  tags,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  onCreateSubtask,
  allowDrag = true,
  isSelected = false,
  onSelect,
  preferences
}) {
  const { user } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const inputRef = useRef(null);

  const isCompleted = task.status === 'done';
  const isWontDo = task.status === 'wont_do';
  const taskList = lists?.find(l => l.id === task.list_id);
  const taskTags = tags?.filter(t => task.tag_ids?.includes(t.id)) || [];

  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);
  const isOverdue = dueDate && isPast(dueDate) && !isCompleted && !isWontDo;

  const isAIScheduled = task.auto_scheduled || task.ai_suggested;
  const scheduledDate = task.scheduled_start_time ? parseISO(task.scheduled_start_time) : null;

  const eventCategories = preferences?.event_categories || [
    {name: "work", color: "#3b82f6"},
    {name: "personal", color: "#8b5cf6"},
    {name: "meeting", color: "#ec4899"},
    {name: "appointment", color: "#10b981"},
    {name: "reminder", color: "#f59e0b"},
    {name: "travel", color: "#6366f1"},
    {name: "social", color: "#ef4444"}
  ];

  const getDueDateLabel = () => {
    if (!dueDate) return null;
    if (isDueToday) return "Today";
    if (isDueTomorrow) return "Tomorrow";
    return format(dueDate, "MMM d");
  };

  const getDueDateColor = () => {
    if (isOverdue) return "text-red-500";
    if (isDueToday) return "text-orange-500";
    if (isDueTomorrow) return "text-yellow-500";
    return "text-neutral-400";
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleTitleClick = () => {
    if (!isCompleted && !isWontDo) {
      setIsEditing(true);
    }
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    } else {
      setEditedTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleCheckboxClick = (e) => {
    if (e && e.shiftKey && onSelect) {
      onSelect(task.id);
    } else {
      onToggle();
    }
  };

  const handlePriorityChange = (priority) => {
    onUpdate(task.id, { priority });
  };

  const handleCategoryChange = (category) => {
    const selectedCategory = eventCategories.find(c => c.name === category);
    onUpdate(task.id, { 
      category: category,
      color: selectedCategory?.color || '#8b5cf6'
    });
    toast.success(`Category changed to ${category}`);
  };

  const handleMoveToList = (listId) => {
    onUpdate(task.id, { list_id: listId });
  };

  const handleToggleTag = (tagId) => {
    const newTagIds = task.tag_ids?.includes(tagId)
      ? task.tag_ids.filter(id => id !== tagId)
      : [...(task.tag_ids || []), tagId];
    onUpdate(task.id, { tag_ids: newTagIds });
  };

  const handleTogglePin = () => {
    onUpdate(task.id, { is_pinned: !task.is_pinned });
  };

  const handleWontDo = () => {
    onUpdate(task.id, { status: 'wont_do' });
  };

  const handleDateSelect = (date) => {
    onUpdate(task.id, { due_date: date ? format(date, 'yyyy-MM-dd') : null });
    setIsDatePickerOpen(false);
  };

  const handleCopyLink = () => {
    const taskLink = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard.writeText(taskLink);
    toast.success("Link copied to clipboard");
  };

  const leftBorderColor = (preferences?.auto_categorize_events && task.color) 
    ? task.color 
    : priorityColors[task.priority] || priorityColors.medium;

  const checkboxColor = priorityColors[task.priority] || priorityColors.medium;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout
          initial={{ opacity: 0, y: -10 }}
          animate={{ 
            opacity: isDragging ? 0.5 : 1, 
            y: 0,
            scale: isSelected ? 0.98 : 1
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ 
            layout: { duration: 0.2, ease: "easeInOut" },
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 }
          }}
          draggable={allowDrag && !isEditing}
          onDragStart={(e) => {
            if (!allowDrag || isEditing) {
              e.preventDefault();
              return;
            }
            const dragImg = document.createElement('div');
            dragImg.style.opacity = '0';
            document.body.appendChild(dragImg);
            e.dataTransfer.setDragImage(dragImg, 0, 0);
            setTimeout(() => document.body.removeChild(dragImg), 0);
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', task.id);
            onDragStart?.(e);
          }}
          onDragEnd={(e) => {
            onDragEnd?.();
          }}
          onDragOver={(e) => {
            if (!allowDrag || isEditing) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            onDragOver?.(e);
          }}
          onDrop={(e) => {
            if (!allowDrag || isEditing) return;
            e.preventDefault();
            onDrop?.(e);
          }}
          className={`group relative mb-2 bg-neutral-900 rounded-lg border transition-all
            ${allowDrag && !isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
            ${isCompleted ? 'border-green-500/30 opacity-60' : 
              isWontDo ? 'border-neutral-700 opacity-50' :
              isOverdue ? 'border-red-500/50' : 
              'border-neutral-800 hover:border-neutral-700'}
            ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 bg-neutral-800' : ''}
            ${task.is_pinned ? 'ring-1 ring-blue-500/20' : ''}
            ${isAIScheduled ? 'ring-1 ring-purple-500/30' : ''}
          `}
          style={{ 
            borderLeftWidth: '4px',
            borderLeftColor: leftBorderColor
          }}
        >
          <div className="flex items-start gap-3 p-3 pl-4">
            {allowDrag && (
              <div 
                className="text-neutral-600 hover:text-neutral-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            <Checkbox
              checked={isCompleted || isSelected}
              onCheckedChange={handleCheckboxClick}
              className="mt-0.5 flex-shrink-0 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              style={{
                borderColor: !isCompleted && !isSelected ? checkboxColor : undefined,
                borderWidth: !isCompleted && !isSelected ? '2px' : undefined,
                backgroundColor: isSelected ? '#3b82f6' : undefined
              }}
            />

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full bg-transparent text-sm text-neutral-100 border-none outline-none focus:ring-0 p-0 font-medium"
                />
              ) : (
                <div className="flex items-start gap-2">
                  {task.is_pinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />}
                  {isOverdue && (
                    <span className="text-red-500 font-bold flex-shrink-0">*</span>
                  )}
                  {isAIScheduled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium flex-shrink-0">
                      AI
                    </span>
                  )}
                  <span 
                    onClick={handleTitleClick}
                    className={`text-sm cursor-text font-medium ${
                      isCompleted ? 'line-through text-neutral-500' : 
                      isWontDo ? 'line-through text-neutral-600' :
                      'text-neutral-100'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              )}

              {task.description && !isEditing && (
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {dueDate && (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button className={`flex items-center gap-1 text-xs ${getDueDateColor()} hover:underline`}>
                        <CalendarIcon className="w-3 h-3" />
                        <span className="font-medium">{getDueDateLabel()}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-neutral-800 border-neutral-700" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="rounded-md"
                        modifiers={{
                          scheduled: scheduledDate ? [scheduledDate] : []
                        }}
                        modifiersClassNames={{
                          scheduled: "bg-blue-500/20 text-blue-400 font-semibold"
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {task.duration && (
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    <span>{task.duration}m</span>
                  </div>
                )}

                {scheduledDate && (
                  <span className="text-blue-400 text-[10px] px-1.5 py-0.5 rounded bg-blue-900/20">
                    {format(scheduledDate, 'MMM d, h:mm a')}
                  </span>
                )}

                {taskList && (
                  <Badge 
                    variant="outline" 
                    className="text-xs px-2 py-0.5" 
                    style={{ 
                      borderColor: taskList.color + '40', 
                      color: taskList.color,
                      backgroundColor: taskList.color + '10'
                    }}
                  >
                    {taskList.name}
                  </Badge>
                )}

                {taskTags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="outline" 
                    className="text-xs px-2 py-0.5" 
                    style={{ 
                      borderColor: tag.color + '40', 
                      color: tag.color,
                      backgroundColor: tag.color + '10'
                    }}
                  >
                    #{tag.name}
                  </Badge>
                ))}

                {task.parent_task_id && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 text-purple-400 border-purple-400/40 bg-purple-400/10">
                    Subtask
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 bg-neutral-800 border-neutral-700">
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-neutral-100 focus:bg-neutral-700">
            <Flag className="w-4 h-4 mr-2" />
            Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-neutral-800 border-neutral-700">
            {Object.entries(priorityLabels).map(([key, label]) => (
              <ContextMenuItem
                key={key}
                onClick={() => handlePriorityChange(key)}
                className="text-neutral-100 focus:bg-neutral-700"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: priorityColors[key] }}
                    />
                    {label}
                  </div>
                  {task.priority === key && (
                    <span className="text-blue-400">✓</span>
                  )}
                </div>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-neutral-100 focus:bg-neutral-700">
            <TagIcon className="w-4 h-4 mr-2" />
            Category
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-neutral-800 border-neutral-700">
            {eventCategories.map((category) => (
              <ContextMenuItem
                key={category.name}
                onClick={() => handleCategoryChange(category.name)}
                className="text-neutral-100 focus:bg-neutral-700"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="capitalize">{category.name}</span>
                  </div>
                  {task.category === category.name && (
                    <span className="text-blue-400">✓</span>
                  )}
                </div>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-neutral-700" />

        {onCreateSubtask && (
          <ContextMenuItem onClick={() => onCreateSubtask(task)} className="text-neutral-100 focus:bg-neutral-700">
            <ListPlus className="w-4 h-4 mr-2" />
            Add Subtask
          </ContextMenuItem>
        )}
        
        <ContextMenuItem onClick={handleTogglePin} className="text-neutral-100 focus:bg-neutral-700">
          <Pin className="w-4 h-4 mr-2" />
          {task.is_pinned ? 'Unpin' : 'Pin to Top'}
        </ContextMenuItem>

        <ContextMenuItem onClick={handleWontDo} className="text-neutral-100 focus:bg-neutral-700">
          <XCircle className="w-4 h-4 mr-2" />
          Won't Do
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-neutral-700" />

        {lists && lists.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-neutral-100 focus:bg-neutral-700">
              <FolderInput className="w-4 h-4 mr-2" />
              Move to List
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-neutral-800 border-neutral-700">
              <ContextMenuItem
                onClick={() => handleMoveToList(null)}
                className="text-neutral-100 focus:bg-neutral-700"
              >
                None {task.list_id === null && " ✓"}
              </ContextMenuItem>
              {lists.map(list => (
                <ContextMenuItem
                  key={list.id}
                  onClick={() => handleMoveToList(list.id)}
                  className="text-neutral-100 focus:bg-neutral-700"
                >
                  {list.name} {task.list_id === list.id && " ✓"}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        
        {tags && tags.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-neutral-100 focus:bg-neutral-700">
              <TagIcon className="w-4 h-4 mr-2" />
              Tags
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-neutral-800 border-neutral-700">
              {tags.map(tag => (
                <ContextMenuItem
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className="text-neutral-100 focus:bg-neutral-700"
                >
                  {tag.name} {task.tag_ids?.includes(tag.id) && " ✓"}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator className="bg-neutral-700" />

        <ContextMenuItem onClick={handleCopyLink} className="text-neutral-100 focus:bg-neutral-700">
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-neutral-700" />

        <ContextMenuItem onClick={() => onDelete(task.id)} className="text-red-400 focus:bg-neutral-700 focus:text-red-400">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
