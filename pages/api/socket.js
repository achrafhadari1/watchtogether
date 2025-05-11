import { Server } from "socket.io";

// Store room states in memory (shared across function calls)
const rooms = new Map();

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.IO server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // Handle joining the room
      socket.on("join-room", ({ roomId, userName }) => {
        socket.join(roomId);
        const userCount = io.sockets.adapter.rooms.get(roomId)?.size || 1;

        // Get or create room state
        const roomState = rooms.get(roomId) || { videoUrl: null, userCount };
        roomState.userCount = userCount;
        rooms.set(roomId, roomState);

        // Send current state to new user
        socket.emit("room-state", roomState);

        // Emit the user-joined event to all other users in the room
        socket.to(roomId).emit("user-joined", { userName, userCount });
      });

      // Handle sending a chat message
      socket.on("chat-message", ({ roomId, message, userName, senderId }) => {
        const data = {
          id: Date.now(),
          message,
          userName,
          timestamp: new Date().toISOString(),
          senderId: socket.id, // Include senderId
        };

        // Only emit to others, not the sender
        socket.to(roomId).emit("chat-message", data);
      });

      // Handle leaving the room
      socket.on("leave-room", ({ roomId }) => {
        socket.leave(roomId);
        const userCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

        const roomState = rooms.get(roomId);
        if (roomState) {
          roomState.userCount = userCount;
          if (userCount === 0) {
            rooms.delete(roomId);
          } else {
            rooms.set(roomId, roomState);
          }
        }

        io.to(roomId).emit("user-left", { userCount });
      });

      // Handle video-related events
      socket.on("video-url", ({ roomId, url }) => {
        const roomState = rooms.get(roomId) || { videoUrl: null, userCount: 1 };
        roomState.videoUrl = url;
        rooms.set(roomId, roomState);

        io.to(roomId).emit("video-url", { url });
      });

      socket.on("video-state", ({ roomId, playing, currentTime }) => {
        const roomState = rooms.get(roomId) || { videoUrl: null, userCount: 1 };
        roomState.currentTime = currentTime;
        roomState.playing = playing;
        rooms.set(roomId, roomState);

        socket.to(roomId).emit("video-state", { playing, currentTime });
      });

      socket.on("sync-request", ({ roomId, currentTime }) => {
        socket.to(roomId).emit("sync-video", { currentTime });
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }

  res.end();
}

export { rooms };
