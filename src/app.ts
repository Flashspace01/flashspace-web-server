// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { mainRoutes } from "./mainRoutes";
import { dbConnection } from "./config/db.config";
import { EmailUtil } from "./flashspaceWeb/authModule/utils/email.util";
import { GoogleUtil } from "./flashspaceWeb/authModule/utils/google.util";

const PORT: string | number = process.env.PORT || 5000;

const app: Application = express();

// Initialize email service
EmailUtil.initialize();

// Initialize Google OAuth
GoogleUtil.initialize();

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
];

app.use(cors({
  ...corsOptions,
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error("CORS not allowed"), false);
    }
  }
}));
console.log(`CORS enabled for origin: ${corsOptions.origin} with credentials support`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

// Database connection with feedback
dbConnection()
  .then(() => {
    console.log("Database connection established successfully.");
  })
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

// Main API routes
app.use("/api", mainRoutes);

// Start server with feedback and explicit host binding
const HOST = process.env.HOST || '0.0.0.0';
app
  .listen(Number(PORT), HOST, () => {
    const hostLabel = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`API server started at http://${hostLabel}:${PORT}`);
  })
  .on('error', (err: any) => {
    console.error('Failed to start HTTP server:', err?.message || err);
  });
