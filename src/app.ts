import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";

// Explicitly define path to ensure it's found
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

import express, { Application } from "express";
import http from "http"; // Import http module
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import { mainRoutes } from "./mainRoutes";

import { dbConnection } from "./config/db.config";
import { EmailUtil } from "./flashspaceWeb/authModule/utils/email.util";
import { GoogleUtil } from "./flashspaceWeb/authModule/utils/google.util";
import { initSocket } from "./socket"; // Import socket init
import {
  backfillLocalUploadsToGridFs,
  serveUploadedFile,
} from "./flashspaceWeb/shared/utils/uploadedFileStore";
import { AuthMiddleware } from "./flashspaceWeb/authModule/middleware/auth.middleware";

const PORT: string | number = process.env.PORT || 5000;

const app: Application = express();
const server = http.createServer(app); // Create HTTP server

// --- Security Rate Limiters ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS", // Skip preflight
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // Limit each IP to 15 authentication attempts per 15 mins
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Required behind reverse proxies (Render/Nginx) for secure cookies and protocol detection
app.set('trust proxy', 1);

// Initialize email service
EmailUtil.initialize();

// Initialize Google OAuth
GoogleUtil.initialize();

// Initialize Socket.IO
initSocket(server);

// CORS configuration with credentials support (MUST be FIRST)
// Updated to fix wildcard CORS issue
// --- CORS Configuration ---
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
  "https://ui-improvement-blush.vercel.app",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "x-api-key",
    "X-API-Key",
    "x-flashspace-csrf",
    "Accept",
    "Origin",
    "X-Requested-With",
    "x-region",
    "X-Region"
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

// Global CORS Middleware
app.use(cors(corsOptions));

// CORS is already handled by the app.use(cors(...)) middleware below
console.log(
  `CORS enabled for origin: ${corsOptions.origin} with credentials support`,
);

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Apply Global Rate Limiting
// Global rate limit removed as requested
// app.use("/api", globalLimiter);

// Data sanitization against NoSQL query injection (Express compatible)
const safeSanitize = (obj: any) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        safeSanitize(obj[key]);
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body) safeSanitize(req.body);
  if (req.query) safeSanitize(req.query);
  if (req.params) safeSanitize(req.params);
  next();
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// CSRF Protection Middleware (Custom Header Check)
app.use((req, res, next) => {
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  
  if (isStateChanging) {
    const csrfHeader = req.headers["x-flashspace-csrf"];
    if (csrfHeader !== "true") {
      console.warn(`[CSRF BLOCK] Method: ${req.method}, URL: ${req.url}, Origin: ${req.headers.origin}`);
      return res.status(403).json({
        success: false,
        message: "Security violation: Request blocked by CSRF protection",
      });
    }
  }
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: false, // Set to false if you are loading images from other domains
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: "unsafe-none" as any, // Fix Google Login popup issue
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        frameAncestors: ["'self'", "http://localhost:*", "https://localhost:*"],
      },
    },
    frameguard: false, // Disable X-Frame-Options to let CSP frame-ancestors handle framing
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
    console.log(`[SERVER] Started/Restarted at: ${new Date().toISOString()}`);

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

    backfillLocalUploadsToGridFs()
      .then((result) => {
        console.log(
          `[UploadedFileStore] Backfill complete. scanned=${result.scanned}, backedUp=${result.backedUp}, skipped=${result.skipped}, failed=${result.failed}`,
        );
      })
      .catch((err) => {
        console.error("[UploadedFileStore] Backfill failed:", err);
      });
  })
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

// Serve uploaded files
const removeFrameAncestorsAndCSP = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Frame-Options");
  next();
};

// Public files (Profile pictures and Property images)
app.use("/uploads/profile-pictures", removeFrameAncestorsAndCSP, serveUploadedFile);
app.use("/api/uploads/profile-pictures", removeFrameAncestorsAndCSP, serveUploadedFile);
app.use("/uploads/property-images", removeFrameAncestorsAndCSP, serveUploadedFile);
app.use("/api/uploads/property-images", removeFrameAncestorsAndCSP, serveUploadedFile);

// Private files (KYC, Invoices, Tickets, etc.) - Requires Authentication
app.use("/uploads", AuthMiddleware.authenticate, removeFrameAncestorsAndCSP, serveUploadedFile);
app.use("/api/uploads", AuthMiddleware.authenticate, removeFrameAncestorsAndCSP, serveUploadedFile);

// Main API routes
app.get("/api/super-test", (req, res) => {
  res.json({ success: true, message: "SUPER TEST - app.ts is working" });
});

// Apply strict rate limit to Auth routes
// Strict rate limit removed from Auth routes as requested
// app.use("/api/auth", authLimiter);

app.use("/api", mainRoutes);

// 404 Handler for /api
app.use("/api", (req, res) => {
  console.log(`[404] No route found for ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[GLOBAL ERROR]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong",
    error: process.env.NODE_ENV === "development" ? err : "Internal Server Error",
  });
});

// Default 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested resource not found",
  });
});

// TART - force nodemon restart 2555159050858
// TART - force nodemon restart 2555159050857
// TART - force nodemon restart ${Date.now()}
// RESTART - force reload for visit fields 12345
