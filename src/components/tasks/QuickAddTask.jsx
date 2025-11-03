import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function QuickAddTask({ onAdd, onDetailedAdd, isLoading }) {
  const [taskTitle, setTaskTitle] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskTitle.trim()) {
      onAdd(taskTitle.trim());
      setTaskTitle("");
    }
  };

  const handleDetailedAdd = () => {
    if (taskTitle.trim()) {
      onDetailedAdd(taskTitle.trim());
      setTaskTitle("");
    } else {
      onDetailedAdd("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="p-4 bg-card rounded-lg border border-border">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Zap className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Quick add task... (uses your default preferences)"
              className="pl-10 bg-background text-lg h-12"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="button"
            onClick={handleDetailedAdd}
            variant="outline"
            className="px-4 h-12 border-border hover:bg-accent"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button 
            type="submit" 
            disabled={!taskTitle.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 h-12"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 ml-10">
          ⚡ Smart add with your preferences - creates tasks and optional calendar events
        </p>
      </div>
    </motion.div>
  );
}