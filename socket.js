import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust this in production for security
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Client connected to Socket.io: ${socket.id}`);

    // You can handle specific events here if needed
    // socket.on("join-room", (roomId) => { ... });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected from Socket.io: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call initSocket(server) first.");
  }
  return io;
};
