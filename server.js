// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Firebase
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCEVfe1DpEB4sVjng3Q5qaZ-190QjmXyY0",
  authDomain: "alloo-web.firebaseapp.com",
  projectId: "alloo-web",
  storageBucket: "alloo-web.appspot.com",
  messagingSenderId: "132232824762",
  appId: "1:132232824762:web:4e3c25557c072f0feabf83"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ⚡ آنلاین کاربران
const onlineUsers = {};

// 🔌 Socket.IO
io.on("connection", (socket) => {

  socket.on("login", async (username) => {
    if (!username || username.length < 3) return;

    onlineUsers[username] = socket.id;

    await setDoc(doc(db, "users", username), {
      name: username,
      online: true,
      lastSeen: new Date().toISOString()
    });

    socket.emit("login-success", username);
    io.emit("users", Object.keys(onlineUsers));
  });

  socket.on("disconnect", async () => {
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
        await setDoc(doc(db, "users", user), {
          name: user,
          online: false,
          lastSeen: new Date().toISOString()
        });
      }
    }
    io.emit("users", Object.keys(onlineUsers));
  });
});

// ✅ پابلیک
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));