import { rooms } from "./socket"; // Import shared room state

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { roomId, videoUrl } = req.body;

    if (!roomId || !videoUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const io = res.socket.server.io;
    if (!io) {
      return res.status(500).json({ message: "Socket.IO not initialized" });
    }

    // Update room state
    const roomState = rooms.get(roomId) || { videoUrl: null, userCount: 1 };
    roomState.videoUrl = videoUrl;
    rooms.set(roomId, roomState);

    // Emit to all in room
    io.to(roomId).emit("video-url", { url: videoUrl });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling video request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
