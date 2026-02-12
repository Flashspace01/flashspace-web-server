import dotenv from "dotenv";
import path from 'path';

// Explicitly define path to ensure it's found
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

import express, { Application } from "express";
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

// Initialize email service
EmailUtil.initialize();

// Initialize Google OAuth
GoogleUtil.initialize();

<<<<<<< HEAD
// Initialize Socket.IO
initSocket(server);

// CORS configuration with credentials support (MUST be FIRST) 
// Updated to fix wildcard CORS issue
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const allowedOrigins = [
=======
// CORS configuration with credentials support (MUST be FIRST)
// Avoid wildcard origin when credentials are included
const allowedOrigins = new Set([
>>>>>>> cb0547d (Added Test Scripts/Space-Portal)
  'https://flash-space-web-client.vercel.app',
  'https://flash-space-web-client-jb2vq5x0x-darkopers-projects.vercel.app',
  'https://flash-space-web-client-rkjsstvnb-darkopers-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://flashspace.ai',
  'https://www.flashspace.ai',
  'http://72.60.219.115:8080',
  'http://72.60.219.115'
]);

const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
envOrigins.forEach((origin) => allowedOrigins.add(origin));

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    // Allow requests with no origin (like mobile apps or curl) without setting CORS headers
    if (!origin) {
      return callback(null, false);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, origin);
    }

    console.error('CORS blocked origin:', origin);
    return callback(new Error("CORS not allowed"), false);
  }
<<<<<<< HEAD
}));
console.log(`CORS enabled for origin: ${corsOptions.origin} with credentials support`);
console.log(process.env.MONGODB_URI)

=======
};

app.use(cors(corsOptions));
// Express 5 + path-to-regexp: avoid "*" string, use regex for catch-all
app.options(/.*/, cors(corsOptions));
console.log(`CORS enabled for allowed origins: ${Array.from(allowedOrigins).join(', ')}`);
>>>>>>> cb0547d (Added Test Scripts/Space-Portal)

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  xFrameOptions: false,
  contentSecurityPolicy: false
}));

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
    const HOST = process.env.HOST || '0.0.0.0';
    server // Listen on server, not app
      .listen(Number(PORT), HOST, () => {
        const hostLabel = HOST === '0.0.0.0' ? 'localhost' : HOST;
        console.log(`API server started at http://${hostLabel}:${PORT}`);
      })
      .on('error', (err: any) => {
        console.error('Failed to start HTTP server:', err?.message || err);
      });
  })
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

// Serve uploaded files statically
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Main API routes
app.use("/api", mainRoutes);
