'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  MessageSquare, 
  Users, 
  MonitorPlay
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoomHeader({ roomId, userCount, toggleChat, isChatOpen }) {
  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="hidden md:flex items-center space-x-2">
            <MonitorPlay className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">SyncView</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="flex items-center mr-3 bg-background/50 px-2 py-1 rounded-md">
            <Users className="h-4 w-4 text-muted-foreground mr-1" />
            <span className="text-sm text-muted-foreground">
              {userCount} online
            </span>
          </div>
          
          <div className="flex items-center mr-1 bg-background/50 px-2 py-1 rounded-md">
            <span className="text-xs text-muted-foreground font-mono">
              Room: {roomId}
            </span>
          </div>
          
          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="sm"
            onClick={toggleChat}
            className={cn(
              "transition-colors",
              isChatOpen && "bg-primary text-primary-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
        </div>
      </div>
    </header>
  );
}