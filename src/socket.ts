import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://flash-space-web-client.vercel.app",
    "https://flashspace.ai",
    "https://www.flashspace.ai",
  ].filter(Boolean) as string[];

  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = parseInt(process.env.REDIS_PORT || "6379");

  // Create Redis client
  const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log(
      `Socket.io Adapter connected to Redis at ${redisHost}:${redisPort}`,
    );
  });

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("New client connected", socket.id);

    // Join ticket room
    socket.on("join_ticket", (ticketId: string) => {
      socket.join(ticketId);
      console.log(`Socket ${socket.id} joined ticket room: ${ticketId}`);
    });

    // Join user specific notification feed
    socket.on("join_user_feed", (userId: string) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined user_feed: ${userId}`);
    });

    io.on("connection", (socket: Socket) => {
        console.log("New client connected", socket.id);

        // Join ticket room
        socket.on("join_ticket", (ticketId: string) => {
            socket.join(ticketId);
            console.log(`Socket ${socket.id} joined ticket room: ${ticketId}`);
        });

        // Join user specific notification feed
        socket.on("join_user_feed", (userId: string) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined user_feed: ${userId}`);
        });

        // Join admin feed
        socket.on("join_admin_feed", () => {
            socket.join("admin_feed");
            console.log(`Socket ${socket.id} joined admin_feed`);
        });

        // Handle typing events
        socket.on("typing", (data: { ticketId: string; user: string }) => {
            socket.to(data.ticketId).emit("typing", data);
        });

        socket.on("stop_typing", (data: { ticketId: string }) => {
            socket.to(data.ticketId).emit("stop_typing", data);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected", socket.id);
        });
    });

    // Handle typing events
    socket.on("typing", (data: { ticketId: string; user: string }) => {
      socket.to(data.ticketId).emit("typing", data);
    });

    socket.on("stop_typing", (data: { ticketId: string }) => {
      socket.to(data.ticketId).emit("stop_typing", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
