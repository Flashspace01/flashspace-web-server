import mongoose from "mongoose";

export const dbConnection = async () => {
    try {
        const dbUri = process.env.DB_URI || "mongodb://127.0.0.1:27018/myapp";
        console.log(`Attempting to connect to MongoDB at: ${dbUri}`);

        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        });
        console.log("Connected to Database!");

        // Drop legacy TTL indexes that delete users silently
        try {
            await mongoose.connection.db?.collection('users').dropIndex('emailVerificationOTPExpiry_1');
            console.log("Legacy emailVerificationOTPExpiry TTL index dropped successfully.");
        } catch (e: any) {
            // Ignore if index doesn't exist
            if (e.codeName !== 'IndexNotFound') {
                console.error("Error dropping emailVerificationOTPExpiry index:", e);
            }
        }

        try {
            await mongoose.connection.db?.collection('users').dropIndex('resetPasswordExpiry_1');
            console.log("Legacy resetPasswordExpiry TTL index dropped successfully.");
        } catch (e: any) {
            // Ignore if index doesn't exist
            if (e.codeName !== 'IndexNotFound') {
                console.error("Error dropping resetPasswordExpiry index:", e);
            }
        }

    } catch (err: any) {
        console.error("Mongoose Connection Error:", err);

        // Fallback logic if the primary URI fails and it's not the default
        if (process.env.DB_URI && process.env.DB_URI.includes("27018")) {
            console.log("Primary connection failed. Attempting fallback to default port 27017...");
            try {
                await mongoose.connect("mongodb://127.0.0.1:27017/myapp", {
                    serverSelectionTimeoutMS: 5000,
                    family: 4
                });
                console.log("Connected to Database on fallback port 27017!");
                return;
            } catch (fallbackErr) {
                console.error("Fallback connection also failed:", fallbackErr);
            }
        }
        throw err;
    }
}