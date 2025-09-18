// server.js (backend)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const users = {}; // socketId -> { username, isAdmin }
let adminSocketId = null;

io.on("connection", (socket) => {
  console.log(`🔌 ${socket.id} connected`);

  socket.on("set_identity", ({ name }) => {
    if (!name) return socket.emit("identity_error", "Username is required");

    if (name === "001") {
      if (adminSocketId) return socket.emit("identity_error", "Admin already connected");
      adminSocketId = socket.id;
      users[socket.id] = { username: name, isAdmin: true };
      console.log(`🎧 Admin logged in`);
      emitUsersListToAdmin();
    } else {
      const nameTaken = Object.values(users).some(u => u.username === name);
      if (nameTaken) return socket.emit("identity_error", "Username already taken");
      users[socket.id] = { username: name, isAdmin: false };
      console.log(`🙂 User "${name}" registered`);
      emitUsersListToAdmin();
    }

    socket.emit("identity_ok", { username: name });
  });

  socket.on("send_message", ({ to, text, image }) => {
    const user = users[socket.id];
    if (!user || !to || (!text && !image)) return;
  
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg = {
      from: user.username,
      to,
      text: text || "",
      image: image || null, // accept base64 image
      time,
    };
  
    const receiver = Object.entries(users)
      .find(([_, u]) => u.username === to)?.[0];
  
    if (receiver) {
      io.to(receiver).emit("receive_message", msg);
      socket.emit("receive_message", msg); // echo back to sender
    } else {
      socket.emit("send_error", "Recipient not found");
    }
  });
  

  socket.on("typing", ({ to }) => {
    emitTypingEvent(socket, to, "typing");
  });

  socket.on("stop_typing", ({ to }) => {
    emitTypingEvent(socket, to, "stop_typing");
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (!user) return;

    console.log(`👋 ${user.isAdmin ? "Admin" : "User"} "${user.username}" disconnected`);
    delete users[socket.id];

    if (user.isAdmin) {
      adminSocketId = null;
      io.emit("admin_disconnected");
    }
    emitUsersListToAdmin();
  });
});

function emitUsersListToAdmin() {
  if (!adminSocketId) return;
  const list = Object.values(users)
    .filter(u => !u.isAdmin)
    .map(u => u.username);
  io.to(adminSocketId).emit("update_users_list", list);
}

function emitTypingEvent(socket, to, eventName) {
  const user = users[socket.id];
  if (!user || !to) return;

  const target = Object.entries(users)
    .find(([_, u]) => u.username === to)?.[0];
  if (target) io.to(target).emit(eventName, { from: user.username });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Listening on :${PORT}`));
