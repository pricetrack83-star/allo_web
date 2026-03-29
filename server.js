// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");

// Firebase
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, query, orderBy, getDocs, doc, setDoc } = require("firebase/firestore");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCEVfe1DpEB4sVjng3Q5qaZ-190QjmXyY0",
  authDomain: "alloo-web.firebaseapp.com",
  projectId: "alloo-web",
  storageBucket: "alloo-web.firebasestorage.app",
  messagingSenderId: "132232824762",
  appId: "1:132232824762:web:4e3c25557c072f0feabf83"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ⚡ RAM برای سرعت
const onlineUsers = {};

// 🎤 آپلود ویس
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, "uploads"),
    filename: (_, __, cb) => cb(null, Date.now() + ".webm")
});
const upload = multer({ storage });

app.post("/upload-voice", upload.single("voice"), (req, res) => {
    res.json({ url: "/uploads/" + req.file.filename });
});

// 🔌 SOCKET.IO
io.on("connection", (socket) => {

    socket.on("login", async (username) => {
        if (!username || username.length < 3) return;

        onlineUsers[username] = socket.id;

        // ذخیره کاربر در Firestore
        await setDoc(doc(db, "users", username), {
            name: username,
            online: true,
            lastSeen: new Date().toISOString()
        });

        socket.emit("login-success", username);

        // Load messages
        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        const messages = querySnapshot.docs.map(d => d.data());
        socket.emit("load-messages", messages);

        io.emit("users", Object.keys(onlineUsers));
    });

    socket.on("send-message", async (data) => {
        await addDoc(collection(db, "messages"), { ...data, timestamp: new Date().toISOString() });

        if (data.to && onlineUsers[data.to]) {
            io.to(onlineUsers[data.to]).emit("receive-message", data);
        }
        socket.emit("receive-message", data);
    });

    socket.on("send-voice", async (data) => {
        await addDoc(collection(db, "messages"), { ...data, timestamp: new Date().toISOString() });

        if (data.to && onlineUsers[data.to]) {
            io.to(onlineUsers[data.to]).emit("receive-voice", data);
        }
        socket.emit("receive-voice", data);
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

server.listen(4000, () => console.log("🚀 Server running: http://localhost:4000"));