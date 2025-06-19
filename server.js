// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow cross-origin requests (important for frontend)

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update this later for security
  },
});

// When a client connects
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  // Listen for message from client
  socket.on("send_message", (data) => {
    console.log("📨 Received:", data);

    // Broadcast to all clients except sender
    socket.broadcast.emit("receive_message", data);
  });

  // When client disconnects
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Start server on port 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// /hjkdfjhsg