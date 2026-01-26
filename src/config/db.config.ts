import mongoose from "mongoose";

export const dbConnection = async () => {
    try {
        if (!process.env.DB_URI) {
            throw new Error("DB_URI is not defined in environment variables");
        }
        await mongoose.connect(process.env.DB_URI as string, {
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