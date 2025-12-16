import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Info } from "lucide-react";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function UserNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all hover:bg-neutral-800 focus:outline-none">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-neutral-800 text-neutral-200 text-sm font-semibold">
              T
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start overflow-hidden">
            <p className="text-base font-medium text-white truncate w-full">Timelit</p>
            <p className="text-xs text-neutral-400 truncate w-full">Demo App</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-56 bg-neutral-800 border-neutral-700">
        <DropdownMenuItem asChild className="text-neutral-200 focus:bg-neutral-700 focus:text-neutral-100">
           <Link to={createPageUrl("Settings")} className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
           </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer text-neutral-200 focus:bg-neutral-700 focus:text-neutral-100">
          <Info className="mr-2 h-4 w-4" />
          <span>About Timelit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}