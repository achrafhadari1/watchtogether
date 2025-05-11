'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LinkIcon, Search } from 'lucide-react';

export default function VideoUrlInput({ roomId, setVideoUrl }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    setUrl(e.target.value);
  };

  const isDirectMediaUrl = (url) => {
    const mediaExtensions = /\.(m3u8|mp4|webm|ogg)($|\?)/i;
    return mediaExtensions.test(url);
  };

  const loadVideo = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setIsLoading(true);
      
      // Prepare URL (add https if missing)
      let processedUrl = url.trim();
      if (!/^https?:\/\//i.test(processedUrl)) {
        processedUrl = 'https://' + processedUrl;
      }

      // If it's a direct media URL, use it immediately
      if (isDirectMediaUrl(processedUrl)) {
        const socket = getSocket();
        socket.emit('video-url', { roomId, url: processedUrl });
        setVideoUrl(processedUrl);
        setUrl('');
        toast.success('Video loaded successfully');
      } else {
        // If it's not a direct media URL, redirect to the probe page
        const encodedUrl = encodeURIComponent(processedUrl);
        router.push(`/probe?url=${encodedUrl}&roomId=${roomId}`);
      }
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={loadVideo} className="flex w-full sm:w-auto">
      <div className="relative flex-1 flex items-center">
        <Input
          type="text"
          placeholder="Enter video URL or streaming site"
          value={url}
          onChange={handleInputChange}
          className="pr-24 bg-background border-input focus:ring-primary"
        />
        <Button 
          type="submit" 
          disabled={isLoading || !url.trim()} 
          className="absolute right-0 rounded-l-none"
          size="sm"
        >
          {isDirectMediaUrl(url) ? (
            <>
              <LinkIcon className="h-4 w-4 mr-1" />
              Load
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-1" />
              Detect
            </>
          )}
        </Button>
      </div>
    </form>
  );
}