import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";

// Explicitly define path to ensure it's found
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

import express, { Application, Request, Response, NextFunction } from "express";
import http from "http"; // Import http module
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { mainRoutes } from "./mainRoutes";
import { dbConnection } from "./config/db.config";
import { EmailUtil } from "./flashspaceWeb/authModule/utils/email.util";
import { GoogleUtil } from "./flashspaceWeb/authModule/utils/google.util";
import { initSocket } from "./socket"; // Import socket init

const PORT: string | number = process.env.PORT || 5000;

const app: Application = express();
const server = http.createServer(app); // Create HTTP server

// Required behind reverse proxies (Render/Nginx) for secure cookies and protocol detection
app.set("trust proxy", 1);

// Initialize email service
EmailUtil.initialize();

// Initialize Google OAuth
GoogleUtil.initialize();

// Initialize Socket.IO
initSocket(server);

const allowedOrigins = [
  "https://flash-space-web-client.vercel.app",
  "https://flash-space-web-client-jb2vq5x0x-darkopers-projects.vercel.app",
  "https://flash-space-web-client-rkjsstvnb-darkopers-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://flashspace.ai",
  "https://www.flashspace.ai",
  "http://72.60.219.115:8080",
  "http://72.60.219.115",
];

// Manual CORS/COOP and Preflight handling
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const isAllowed = origin && allowedOrigins.includes(origin);

  console.log(
    `[CORS-DEBUG] Method: ${req.method}, Path: ${req.path}, Origin: ${origin}, Allowed: ${isAllowed}`,
  );

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin!);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    // In dev, if origin is missing, still allow headers for testing
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin || "http://localhost:5173",
    );
    // NEVER USE '*' with credentials
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Cookie,X-Requested-With",
  );
  res.setHeader("Access-Control-Expose-Headers", "Set-Cookie");

  // Set COOP header for Google Auth
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // Handle preflight
  if (req.method === "OPTIONS") {
    console.log(`[CORS-DEBUG] Responding to OPTIONS preflight for ${req.path}`);
    res.status(204).end();
    return;
  }

  next();
});
console.log(`CORS enabled for allowed origins with credentials support`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    xFrameOptions: false,
    contentSecurityPolicy: false,
  }),
);

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Database connection with feedback
dbConnection()
  .then(() => {
    console.log("Database connection established successfully.");

    // Start server with feedback and explicit host binding
    const HOST = process.env.HOST || "0.0.0.0";
    server // Listen on server, not app
      .listen(Number(PORT), HOST, () => {
        const hostLabel = HOST === "0.0.0.0" ? "localhost" : HOST;
        console.log(`API server started at http://${hostLabel}:${PORT}`);
      })
      .on("error", (err: any) => {
        console.error("Failed to start HTTP server:", err?.message || err);
      });
  })
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

// Serve uploaded files statically
// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Main API routes
app.use("/api", mainRoutes);

// Catch-all route for unknown API endpoints (must be after all other routes)
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message || err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
