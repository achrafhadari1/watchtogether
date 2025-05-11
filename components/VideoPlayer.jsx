"use client";

import { useState, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { toast } from "sonner";

export default function VideoPlayer({ roomId, videoUrl, subtitlesUrl }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const lastStateUpdate = useRef(0);
  const ignoreNextStateChange = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-room", { roomId, userName: "Guest" });
    socket.emit("get-room-state", { roomId });
    const handleVideoState = (state) => {
      if (!playerRef.current || ignoreNextStateChange.current) {
        ignoreNextStateChange.current = false;
        return;
      }

      const { playing, currentTime } = state;

      if (Math.abs(playerRef.current.currentTime - currentTime) > 0.5) {
        playerRef.current.currentTime = currentTime;
      }

      if (playing && playerRef.current.paused) {
        playerRef.current.play().catch(() => {});
      } else if (!playing && !playerRef.current.paused) {
        playerRef.current.pause();
      }
    };

    const handleSync = (data) => {
      if (!playerRef.current) return;
      playerRef.current.currentTime = data.currentTime;
      toast.info("Video synced with room");
    };

    const handleRoomState = (roomState) => {
      if (roomState.videoUrl) {
        setCurrentVideoUrl(roomState.videoUrl);

        // Delay seeking until after player is initialized
        setTimeout(() => {
          if (playerRef.current && roomState.currentTime != null) {
            playerRef.current.currentTime = roomState.currentTime;

            if (roomState.playing) {
              playerRef.current.play().catch(() => {});
            }
          }
        }, 500); // slight delay to ensure player is ready
      }
    };

    const handleVideoUrl = ({ url }) => {
      setCurrentVideoUrl(url);
    };

    socket.on("video-state", handleVideoState);
    socket.on("sync-video", handleSync);
    socket.on("room-state", handleRoomState);
    socket.on("video-url", handleVideoUrl);

    // Request current room state when component mounts
    socket.emit("get-room-state", { roomId });

    return () => {
      socket.off("video-state", handleVideoState);
      socket.off("sync-video", handleSync);
      socket.off("room-state", handleRoomState);
      socket.off("video-url", handleVideoUrl);
    };
  }, [roomId]);

  useEffect(() => {
    const video = videoRef.current;
    let hls;

    if (Hls.isSupported() && videoUrl) {
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playerRef.current = new Plyr(video, {
          captions: { active: true, update: true, language: "en" },
        });
      });

      // Optional: forward subtitle tracks to Plyr
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
        console.log("Subtitle tracks found:", data.subtitleTracks);

        // Remove old <track> elements
        const videoEl = videoRef.current;
        const existingTracks = videoEl.querySelectorAll("track");
        existingTracks.forEach((track) => track.remove());

        data.subtitleTracks.forEach((track, index) => {
          const trackEl = document.createElement("track");
          trackEl.kind = "subtitles";
          trackEl.label = track.name || `Track ${index + 1}`;
          trackEl.srclang = track.lang || "en";
          trackEl.default = index === 0;
          trackEl.src = track.url;

          videoEl.appendChild(trackEl);
        });

        // Tell Plyr to refresh its tracks UI
        if (playerRef.current) {
          playerRef.current.toggleCaptions(true);
        }
      });
    }
  }, [videoUrl]);

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setIsInitialized(false);
  };

  useEffect(() => {
    if (!currentVideoUrl || !videoRef.current) return;

    cleanup();
    setLoading(true);

    const initTimer = setTimeout(() => {
      try {
        playerRef.current = new Plyr(videoRef.current, {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "captions",
            "settings",
            "pip",
            "fullscreen",
          ],
          settings: ["captions", "quality", "speed"],
          captions: { active: true, update: true, language: "en" },
          quality: {
            default: 720,
            options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240],
          },
        });

        if (currentVideoUrl.includes(".m3u8") && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: true,
          });

          hls.loadSource(currentVideoUrl);
          hls.attachMedia(videoRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            setIsInitialized(true);
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  toast.error("Network error while loading video");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  toast.error("Media error while playing video");
                  hls.recoverMediaError();
                  break;
                default:
                  toast.error("Failed to load video stream");
                  hls.destroy();
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else {
          videoRef.current.src = currentVideoUrl;
          setLoading(false);
          setIsInitialized(true);
        }

        if (playerRef.current) {
          playerRef.current.on("timeupdate", () => {
            const now = Date.now();
            if (now - lastStateUpdate.current > 2000) {
              broadcastVideoState();
              lastStateUpdate.current = now;
            }
          });

          playerRef.current.on("seeking", broadcastVideoState);
          playerRef.current.on("play", () => broadcastVideoState(true));
          playerRef.current.on("pause", () => broadcastVideoState(false));
        }
      } catch (error) {
        console.error("Error initializing video player:", error);
        toast.error("Failed to initialize video player");
        setLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [currentVideoUrl]);

  const broadcastVideoState = (forcedPlayingState) => {
    if (!playerRef.current || !roomId) return;

    const socket = getSocket();
    ignoreNextStateChange.current = true;

    socket.emit("video-state", {
      roomId,
      playing:
        forcedPlayingState !== undefined
          ? forcedPlayingState
          : !playerRef.current.paused,
      currentTime: playerRef.current.currentTime,
    });
  };

  const syncEveryone = () => {
    if (!playerRef.current || !roomId) return;

    const socket = getSocket();
    socket.emit("sync-request", {
      roomId,
      currentTime: playerRef.current.currentTime,
    });

    toast.success("Synced everyone to your current time");
  };

  if (!currentVideoUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-card rounded-lg border border-border">
        <p className="text-lg text-muted-foreground mb-2">No video loaded</p>
        <p className="text-sm text-muted-foreground">
          Enter a video URL above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="relative bg-black rounded-lg overflow-hidden w-full aspect-video">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <video
          ref={videoRef}
          className="w-full h-full"
          crossOrigin="anonymous"
          playsInline
        >
          Your browser does not support video playback.
        </video>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={syncEveryone}
          disabled={!isInitialized}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Sync Everyone
        </Button>
      </div>
    </div>
  );
}
