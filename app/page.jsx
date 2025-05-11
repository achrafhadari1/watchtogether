'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MonitorPlay, UserPlus, Film } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  // Generate a random room ID on page load
  useEffect(() => {
    setRoomId(nanoid(8));
  }, []);

  const createRoom = () => {
    router.push(`/room/${roomId}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      router.push(`/room/${roomId}`);
    }
  };

  const handleInputChange = (e) => {
    setRoomId(e.target.value);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-md border-neutral-800 bg-card shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <MonitorPlay size={48} className="text-primary mb-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">SyncView</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Watch videos together with friends in perfect sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-id">Room ID</Label>
            <div className="flex gap-2">
              <Input 
                id="room-id" 
                placeholder="Enter room ID" 
                value={roomId}
                onChange={handleInputChange}
                className="bg-background border-input focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={createRoom} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Film className="mr-2 h-4 w-4" /> Create Room
          </Button>
          <Button 
            onClick={joinRoom} 
            variant="outline" 
            className="w-full border-primary hover:bg-primary/10 transition-colors"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Join Room
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}