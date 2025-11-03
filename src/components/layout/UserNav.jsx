import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut } from "lucide-react";
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function UserNav() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };
    fetchUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  };

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };
  
  if (!currentUser) {
    return <div className="h-14 rounded-lg bg-neutral-800 animate-pulse" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all hover:bg-neutral-800 focus:outline-none">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />
            <AvatarFallback className="bg-neutral-800 text-neutral-200 text-sm font-semibold">
              {getInitials(currentUser.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start overflow-hidden">
            <p className="text-base font-medium text-white truncate w-full">{currentUser.full_name}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-56 bg-neutral-800 border-neutral-700">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-neutral-100">{currentUser.full_name}</p>
            <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-neutral-700" />
        <DropdownMenuItem asChild className="text-neutral-200 focus:bg-neutral-700 focus:text-neutral-100">
           <Link to={createPageUrl("Settings")} className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
           </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-neutral-200 focus:bg-neutral-700 focus:text-neutral-100">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}