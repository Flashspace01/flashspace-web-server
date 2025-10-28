"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const mainRoutes_1 = require("./mainRoutes");
const db_config_1 = require("./config/db.config");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
// CORS configuration: Allow all origins for development, but print a warning.
app.use((0, cors_1.default)());
console.log("CORS enabled for all origins. For production, restrict allowed origins for security.");
// Database connection with feedback
(0, db_config_1.dbConnection)()
    .then(() => {
    console.log("Database connection established successfully.");
})
    .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
});
// Main API routes
app.use("/api", mainRoutes_1.mainRoutes);
// Start server with feedback
app.listen(PORT, () => {
    console.log(`API server started at http://localhost:${PORT}`);
});
