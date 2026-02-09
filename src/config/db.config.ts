import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const dbConnection = async () => {
    try {

        const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!connectionString) {
            throw new Error("MONGO_URI (or MONGODB_URI) is not defined in environment variables");
        }
        await mongoose.connect(connectionString as string, {
            // connection options to help with stability
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4 // Use IPv4, skip trying IPv6 which can cause ESERVFAIL on some networks
        });
        console.log("Connected to Database !");
    } catch (err) {
        console.error("Mongoose Connection Error:", err);
        throw err;
    }
}