import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Edit, CheckCircle, Circle, ArrowUpCircle } from 'lucide-react';

export default function ContextMenu({ 
  isOpen, 
  position, 
  onClose, 
  onDelete, 
  onEdit, 
  onStatusChange, 
  item, 
  isTaskEvent 
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item || !position) return null;

  const safePosition = {
    x: Number(position.x) || 0,
    y: Number(position.y) || 0
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{
        left: `${safePosition.x}px`,
        top: `${safePosition.y}px`,
      }}
    >
      {isTaskEvent && (
        <>
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
            onClick={() => {
              const newStatus = item.task_status === 'done' ? 'todo' : 'done';
              onStatusChange(item, newStatus);
              onClose();
            }}
          >
            {item.task_status === 'done' ? (
              <>
                <Circle className="w-4 h-4" />
                Mark as To Do
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Mark as Done
              </>
            )}
          </button>
          {item.task_status !== 'in_progress' && (
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              onClick={() => {
                onStatusChange(item, 'in_progress');
                onClose();
              }}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Mark as In Progress
            </button>
          )}
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
        </>
      )}
      
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
        onClick={() => {
          onEdit(item);
          onClose();
        }}
      >
        <Edit className="w-4 h-4" />
        Edit
      </button>
      
      <button
        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 hover:text-red-700 flex items-center gap-2"
        onClick={() => {
          onDelete(item);
          onClose();
        }}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );

  return createPortal(menuContent, document.body);
}