// Import necessary modules
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./Message"); // Ensure this path is correct
const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS configuration
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Use CORS middleware
app.use(cors());

// MongoDB connection URI
const mongoURI =
  "mongodb+srv://kanerkartanaya29:dZfvyuEoS5n03hLL@cluster0.be7di.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }) // Use the recommended options
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Array to hold online users
let onlineUsers = [];

// Socket.IO connection event
io.on("connection", async (socket) => {
  console.log("A user connected");

  // Fetch and send chat history to the newly connected user
  try {
    const messages = await Message.find().sort({ _id: 1 });
    socket.emit("chatHistory", messages);
  } catch (err) {
    console.error("Error fetching chat history:", err);
  }

  // Handle user joining the chat
  socket.on("joinChat", (username) => {
    const user = { id: socket.id, username };
    onlineUsers.push(user);
    io.emit("onlineUsers", onlineUsers); // Notify all clients of updated online users
    console.log(`${username} has joined the chat`);
  });

  // Handle incoming chat messages
  socket.on("chatMessage", async ({ message, author }) => {
    const timestamp = new Date().toLocaleTimeString();

    const newMessage = new Message({ message, author, timestamp });
    try {
      await newMessage.save(); // Save message to MongoDB
      io.emit("chatMessage", { message, author, timestamp }); // Broadcast message to all users
    } catch (err) {
      console.error("Error saving message to MongoDB:", err);
    }
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.id !== socket.id);
    io.emit("onlineUsers", onlineUsers); // Notify all clients of updated online users
    console.log("A user disconnected");
  });
});

// Set the port for the server
const PORT = process.env.PORT || 4000; // Changed to 4000 as specified
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
