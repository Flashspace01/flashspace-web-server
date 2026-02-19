"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Explicitly define path to ensure it's found
const envPath = path_1.default.resolve(__dirname, "../.env");
dotenv_1.default.config({ path: envPath });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http")); // Import http module
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mainRoutes_1 = require("./mainRoutes");
const db_config_1 = require("./config/db.config");
const email_util_1 = require("./flashspaceWeb/authModule/utils/email.util");
const google_util_1 = require("./flashspaceWeb/authModule/utils/google.util");
const socket_1 = require("./socket"); // Import socket init
const PORT = process.env.PORT || 5000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // Create HTTP server
// Initialize email service
email_util_1.EmailUtil.initialize();
// Initialize Google OAuth
google_util_1.GoogleUtil.initialize();
// Initialize Socket.IO
(0, socket_1.initSocket)(server);
// Initialize Cron Jobs
const creditExpiration_cron_1 = require("./cron/creditExpiration.cron");
(0, creditExpiration_cron_1.initCreditExpirationJob)();
// CORS configuration with credentials support (MUST be FIRST)
// Avoid wildcard origin when credentials are included
const allowedOrigins = new Set([
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
]);
const envOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
envOrigins.forEach((origin) => allowedOrigins.add(origin));
const corsOptions = {
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) without setting CORS headers
        if (!origin) {
            return callback(null, false);
        }
        if (allowedOrigins.has(origin)) {
            return callback(null, origin);
        }
        console.error("CORS blocked origin:", origin);
        return callback(new Error("CORS not allowed"), false);
    },
};
app.use((0, cors_1.default)(corsOptions));
// Express 5 + path-to-regexp: avoid "*" string, use regex for catch-all
app.options(/.*/, (0, cors_1.default)(corsOptions));
console.log(`CORS enabled for allowed origins: ${Array.from(allowedOrigins).join(", ")}`);
console.log(process.env.MONGODB_URI);
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    xFrameOptions: false,
    contentSecurityPolicy: false,
}));
// Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
// Database connection with feedback
(0, db_config_1.dbConnection)()
    .then(() => {
    console.log("Database connection established successfully.");
    // Start server with feedback and explicit host binding
    const HOST = process.env.HOST || "0.0.0.0";
    server // Listen on server, not app
        .listen(Number(PORT), HOST, () => {
        const hostLabel = HOST === "0.0.0.0" ? "localhost" : HOST;
        console.log(`API server started at http://${hostLabel}:${PORT}`);
    })
        .on("error", (err) => {
        console.error("Failed to start HTTP server:", err?.message || err);
    });
})
    .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
});
// Serve uploaded files statically
// Serve uploaded files statically
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// Health check (Support both /health and /api/health)
const healthCheck = (_req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
};
app.get("/health", healthCheck);
app.get("/api/health", healthCheck);
// Main API routes
app.use("/api", mainRoutes_1.mainRoutes);
