import { useState, useEffect } from "react";
import { io } from "socket.io-client";

let socket;

export const initializeSocket = async () => {
  if (socket) return socket;

  const socketUrl =
    process.env.NODE_ENV === "production"
      ? window.location.origin
      : "http://localhost:3000";

  socket = io(socketUrl, {
    path: "/api/socket",
  });

  return new Promise((resolve) => {
    socket.on("connect", () => {
      console.log("Socket connected");
      resolve(socket);
    });
  });
};

export const useSocket = () => {
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await initializeSocket();
        setSocketInstance(socket); // Save the socket instance in state
      } catch (error) {
        console.error("Failed to initialize socket:", error);
      }
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [socketInstance]);

  return socketInstance; // Return the socket instance
};

// Utility functions to interact with the socket

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  return socket;
};

export const joinRoom = (roomId, userName = "Anonymous") => {
  const socket = getSocket();
  socket.emit("join-room", { roomId, userName });
};

export const leaveRoom = (roomId) => {
  const socket = getSocket();
  socket.emit("leave-room", { roomId });
};

export const sendChatMessage = (
  roomId,
  message,
  userName = "Anonymous",
  userId
) => {
  const socket = getSocket();
  socket.emit("chat-message", { roomId, message, userName, senderId: userId });
};

export const syncVideoRequest = (roomId, currentTime) => {
  const socket = getSocket();
  socket.emit("sync-request", { roomId, currentTime });
};
