export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { roomId, videoUrl, videoTitle } = req.body;

  if (!roomId || !videoUrl) {
    return res.status(400).json({ message: "Missing roomId or videoUrl" });
  }

  const io = req.socket.server.io;

  if (!io) {
    return res.status(500).json({ message: "Socket server not initialized" });
  }

  // Update the videoUrl for the room
  const rooms = global.rooms || new Map();
  const roomState = rooms.get(roomId) || {};
  roomState.videoUrl = videoUrl;
  roomState.videoTitle = videoTitle || "Untitled";
  rooms.set(roomId, roomState);
  global.rooms = rooms;

  // Notify all clients in the room about the new video
  io.to(roomId).emit("video-url", { url: videoUrl });

  return res.status(200).json({ message: "Video sent to room", roomId });
}
