"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// import fileUpload from "express-fileupload";
const mainRoutes_1 = require("./mainRoutes");
const db_config_1 = require("./cofig/db.config");
const app = (0, express_1.default)();
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
// Middleware
// app.use(fileUpload());
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "*",
}));
app.use(express_1.default.urlencoded({ extended: true }));
(0, db_config_1.dbConnection)();
// // Routes
app.use("/api", mainRoutes_1.mainRoutes);
// Health Check
app.get("/", (req, res) => {
    res.send(`Server is running on port ${PORT}`);
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = app;
