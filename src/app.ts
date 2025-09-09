import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { mainRoutes } from "./mainRoutes";
import { dbConnection } from "./config/db.config";

dotenv.config();

const PORT: string | number = process.env.PORT || 5000;

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// CORS configuration: Allow all origins for development, but print a warning.
app.use(cors());
console.log(
  "CORS enabled for all origins. For production, restrict allowed origins for security."
);

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

// Start server with feedback
app.listen(PORT, () => {
  console.log(`API server started at http://localhost:${PORT}`);
});
