import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

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
  const redisUrl = (process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`).trim();
  const forceTls = (process.env.REDIS_TLS || "").toLowerCase() === "true";
  const normalizedRedisUrl = forceTls && redisUrl.startsWith("redis://")
    ? redisUrl.replace(/^redis:\/\//, "rediss://")
    : redisUrl;

  // Create Redis client (TLS via rediss:// protocol)
  const pubClient = createClient({ url: normalizedRedisUrl });
  const subClient = pubClient.duplicate();

  // Handle Redis connection errors to prevent process crash
  pubClient.on("error", (err) => {
    console.error("Redis Pub Client Error:", err.message);
  });
  subClient.on("error", (err) => {
    console.error("Redis Sub Client Error:", err.message);
  });

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`Socket.io Adapter connected to Redis at ${normalizedRedisUrl}`);
    })
    .catch((err) => {
      console.error("Failed to connect Socket.io Redis adapter (falling back to memory adapter):", err.message);
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
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined user_feed: ${userId}`);
      }
    });

    // Join admin feed
    socket.on("join_admin_feed", () => {
      socket.join("admin_feed");
      console.log(`Socket ${socket.id} joined admin_feed`);
    });

 // Join affiliate personal feed for notifications
    socket.on("join_affiliate_feed", (affiliateId: string) => {
      if (affiliateId) {
        const room = `affiliate_${affiliateId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined affiliate_feed: ${room}`);
      }
    });


    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });

    // Handle typing events
    socket.on("typing", (data: { ticketId: string; user: string }) => {
      socket.to(data.ticketId).emit("typing", data);
    });

    socket.on("stop_typing", (data: { ticketId: string }) => {
      socket.to(data.ticketId).emit("stop_typing", data);
    });

    // The disconnect handler is already present above, so no need to duplicate it
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
