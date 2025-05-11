"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import VideoPlayer from "@/components/VideoPlayer";
import ChatBox from "@/components/ChatBox";
import VideoUrlInput from "@/components/VideoUrlInput";
import RoomHeader from "@/components/RoomHeader";
import { initializeSocket, joinRoom, leaveRoom } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function RoomPage() {
  const { roomId } = useParams();
  const searchParams = useSearchParams();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [videoUrl, setVideoUrl] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [messages, setMessages] = useState([]);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  useEffect(() => {
    // Check for video URL in query params
    const urlParam = searchParams.get('videoUrl');
    if (urlParam) {
      setVideoUrl(decodeURIComponent(urlParam));
    }
  }, [searchParams]);

  useEffect(() => {
    let socket;

    const setupSocket = async () => {
      try {
        socket = await initializeSocket();
        setIsSocketConnected(true);

        joinRoom(roomId);

        socket.on("room-state", (state) => {
          if (state.videoUrl) {
            setVideoUrl(state.videoUrl);
          }
          setUserCount(state.userCount);
        });

        socket.on("user-joined", (data) => {
          setUserCount(data.userCount);
          toast.success(`${data.userName} joined the room`);
        });

        socket.on("user-left", (data) => {
          setUserCount(data.userCount);
        });

        socket.on("video-url", (data) => {
          setVideoUrl(data.url);
        });

        socket.on("chat-message", (message) => {
          setMessages((prev) => [...prev, message]);
        });
      } catch (error) {
        console.error("Socket connection error:", error);
        toast.error("Failed to connect to server");
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        leaveRoom(roomId);
      }
    };
  }, [roomId]);

  const copyRoomLink = () => {
    const url = window.location.href.split('?')[0]; // Remove query params
    navigator.clipboard.writeText(url);
    toast.success("Room link copied to clipboard");
  };

  if (!isSocketConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Connecting to room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <RoomHeader
        roomId={roomId}
        userCount={userCount}
        toggleChat={toggleChat}
        isChatOpen={isChatOpen}
      />

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className={`flex-1 flex flex-col ${isChatOpen ? "lg:pr-4" : ""}`}>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <VideoUrlInput roomId={roomId} setVideoUrl={setVideoUrl} />

              <Button
                onClick={copyRoomLink}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Room
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4 pt-0">
            <VideoPlayer roomId={roomId} videoUrl={videoUrl} />
          </div>
        </div>

        {isChatOpen && (
          <>
            <div className="hidden lg:block">
              <Separator orientation="vertical" className="h-full" />
            </div>

            <ChatBox
              roomId={roomId}
              messages={messages}
              setMessages={setMessages}
              className="w-full lg:w-80 border-t lg:border-t-0"
            />
          </>
        )}
      </div>
    </div>
  );
}