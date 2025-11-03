
import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, ListTodo, CheckCircle, Flag, TagIcon } from "lucide-react"; // Added Flag and TagIcon
import { format as formatDate } from "date-fns";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu"; // Added ContextMenu components

const categoryColors = {
  work: "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/50",
  personal: "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700/50",
  meeting: "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/50",
  appointment: "bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700/50",
  reminder: "bg-red-100 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/50",
  travel: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700/50",
  social: "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-700/50"
};

const priorityStyles = {
  low: "border-l-4 border-l-blue-400",
  medium: "border-l-4 border-l-yellow-500",
  high: "border-l-4 border-l-orange-500",
  urgent: "border-l-4 border-l-red-500"
};

// Placeholder data/functions for ContextMenu (assuming these would come from props or a global state in a real app)
const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors = {
  low: "#60A5FA", // Tailwind blue-400
  medium: "#FACC15", // Tailwind yellow-400
  high: "#FB923C", // Tailwind orange-400
  urgent: "#F87171", // Tailwind red-400
};

// Derived from categoryColors for visual representation in ContextMenu
const eventCategories = [
  { name: "work", color: "#BFDBFE" }, // Corresponding to bg-blue-100
  { name: "personal", color: "#E9D5FF" }, // Corresponding to bg-purple-100
  { name: "meeting", color: "#D1FAE5" }, // Corresponding to bg-green-100
  { name: "appointment", color: "#FEF9C3" }, // Corresponding to bg-yellow-100
  { name: "reminder", color: "#FEE2E2" }, // Corresponding to bg-red-100
  { name: "travel", color: "#E0E7FF" }, // Corresponding to bg-indigo-100
  { name: "social", color: "#FCE7F3" }  // Corresponding to bg-pink-100
];

export default function EventItem({ item, onClick, isSelected, variant = "full", preferences }) {
  const isTask = item.type === 'task';
  const isCompleted = isTask && item.status === 'done';

  const formatTime = (date) => {
    const timeFormat = preferences?.time_format === '24' ? 'HH:mm' : 'h:mm a';
    return formatDate(date, timeFormat);
  };

  // Use appropriate colors for completed tasks
  const categoryStyle = isCompleted
    ? "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/50"
    : isTask
      ? "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-900/30 dark:text-slate-200 dark:border-slate-700/50"
      : categoryColors[item.category] || categoryColors.personal;

  const priorityStyle = isCompleted
    ? "border-l-4 border-l-green-500"
    : priorityStyles[item.priority] || priorityStyles.medium;

  const selectionStyle = isSelected ? 'ring-2 ring-offset-1 ring-primary' : '';
  const completedOpacity = isCompleted ? 'opacity-75' : '';

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(item);
  };

  // Placeholder handlers for the context menu actions
  const handlePriorityChange = (newPriority) => {
    console.log(`Setting priority for item ${item.title} to ${newPriority}`);
    // In a real application, this would typically involve a callback to update item data
  };

  const handleCategoryChange = (newCategory) => {
    console.log(`Setting category for item ${item.title} to ${newCategory}`);
    // In a real application, this would typically involve a callback to update item data
  };

  // Alias item as event to match the nomenclature used in the outline for the ContextMenu
  const event = item;

  const renderContextMenu = () => (
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
                {event.priority === key && (
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
                {event.category === category.name && (
                  <span className="text-blue-400">✓</span>
                )}
              </div>
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {/* Additional generic context menu items */}
      <ContextMenuItem className="text-neutral-100 focus:bg-neutral-700">
        Edit Item
      </ContextMenuItem>
      <ContextMenuItem className="text-red-400 focus:bg-red-900 focus:text-red-100">
        Delete Item
      </ContextMenuItem>
    </ContextMenuContent>
  );

  if (variant === "compact") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleClick}
            className={`p-2 rounded-lg cursor-pointer ${categoryStyle} text-xs border hover:shadow-sm transition-all ${selectionStyle} ${completedOpacity} ${priorityStyle}`}
          >
            <div className="flex items-center gap-1 font-semibold truncate">
              {isTask ? (
                isCompleted ?
                  <CheckCircle className="w-3 h-3 flex-shrink-0 text-green-600" /> :
                  <ListTodo className="w-3 h-3 flex-shrink-0" />
              ) : (
                <Clock className="w-3 h-3 flex-shrink-0" />
              )}
              <span className={isCompleted ? 'line-through' : ''}>
                {item.title}
              </span>
            </div>
            {!isTask && (
              <div className="text-xs opacity-80 mt-1">
                {formatTime(new Date(item.start_time))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        {renderContextMenu()}
      </ContextMenu>
    );
  }

  if (variant === "week") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleClick}
            className={`p-2 rounded-lg cursor-pointer bg-card shadow-sm hover:shadow-md border border-border ${priorityStyle} ${completedOpacity} ${selectionStyle} h-full overflow-hidden transition-all`}
          >
            <div className="flex items-start justify-between mb-1">
              <h4 className={`font-semibold text-xs text-foreground truncate flex-1 ${isCompleted ? 'line-through' : ''}`}>
                {isTask && isCompleted && <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mr-1" />}
                {item.title}
              </h4>
              <Badge className={`${categoryStyle} text-xs font-medium border ml-1 flex-shrink-0`}>
                {isTask ? (isCompleted ? 'Done' : 'Task') : item.category}
              </Badge>
            </div>

            {!isTask && (
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(new Date(item.start_time))} - {formatTime(new Date(item.end_time))}
              </div>
            )}

            {item.description && (
              <p className={`text-xs text-muted-foreground truncate ${isCompleted ? 'line-through' : ''}`}>
                {item.description}
              </p>
            )}

            {item.ai_suggested && (
              <Badge variant="secondary" className="text-xs bg-muted text-foreground mt-1">
                ✨ AI
              </Badge>
            )}
          </div>
        </ContextMenuTrigger>
        {renderContextMenu()}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={handleClick}
          className={`p-4 rounded-xl cursor-pointer bg-card shadow-sm hover:shadow-md border border-border ${priorityStyle} ${completedOpacity} ${selectionStyle} transition-all`}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className={`font-semibold text-foreground line-clamp-1 flex items-center gap-2 ${isCompleted ? 'line-through' : ''}`}>
              {isTask && isCompleted && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
              {item.title}
            </h3>
            <Badge className={`${categoryStyle} text-xs font-medium border`}>
              {isTask ? (isCompleted ? 'Completed' : 'Task') : item.category}
            </Badge>
          </div>

          {item.description && (
            <p className={`text-sm text-muted-foreground mb-3 line-clamp-2 ${isCompleted ? 'line-through' : ''}`}>
              {item.description}
            </p>
          )}

          <div className="space-y-2">
            {!isTask && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                {formatTime(new Date(item.start_time))} - {formatTime(new Date(item.end_time))}
              </div>
            )}

            {item.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                {item.location}
              </div>
            )}

            {item.attendees && item.attendees.length > 0 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="w-4 h-4 mr-2" />
                {item.attendees.length} attendee{item.attendees.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {item.ai_suggested && (
            <Badge variant="secondary" className="mt-3 text-xs bg-muted text-foreground">
              ✨ AI Suggested
            </Badge>
          )}
        </div>
      </ContextMenuTrigger>
      {renderContextMenu()}
    </ContextMenu>
  );
}
