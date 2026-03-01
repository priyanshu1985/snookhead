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

    // Client joins their station-scoped room so they only receive events for their station
    socket.on("join-station", (stationId) => {
      if (stationId) {
        const room = `station-${stationId}`;
        socket.join(room);
        console.log(`📍 Socket ${socket.id} joined room: ${room}`);
      }
    });

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

/**
 * Emit a socket event to a specific station room with a data payload.
 * Falls back to global broadcast if no stationId is provided (legacy safety).
 * @param {string} event - Event name e.g. "table-data-changed"
 * @param {number|string|null} stationId - Station ID to scope the broadcast
 * @param {object} data - Payload including action + data for clients
 */
export const emitToStation = (event, stationId, data) => {
  if (!io) return;
  if (stationId) {
    io.to(`station-${stationId}`).emit(event, data);
  } else {
    // Fallback: global emit (e.g. admin actions without station context)
    io.emit(event, data);
  }
};
