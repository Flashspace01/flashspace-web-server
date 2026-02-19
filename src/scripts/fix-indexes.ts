import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const fixIndexes = async () => {
    try {
        console.log("Script started...");
        if (!process.env.DB_URI) {
            throw new Error("DB_URI is defined in .env");
        }

        console.log("Connecting to MongoDB at", process.env.DB_URI.split('@')[1] || '...'); // Log partial URI for safety
        await mongoose.connect(process.env.DB_URI, {
            serverSelectionTimeoutMS: 5000 // Fail fast if can't connect
        });
        console.log("Connected to MongoDB.");

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Failed to get DB handle.");
        }

        // Fix Mail Collection
        try {
            console.log("Checking Mail indexes...");
            const mailCollection = db.collection('mails');
            const indexes = await mailCollection.indexes();
            console.log("Existing Mail indexes:", indexes.map(i => i.name));

            const mailIdIndex = indexes.find(i => i.name === 'mailId_1');
            if (mailIdIndex) {
                console.log("Found conflicting 'mailId_1' index. Dropping...");
                await mailCollection.dropIndex('mailId_1');
                console.log("Dropped 'mailId_1' index.");
            } else {
                console.log("No 'mailId_1' index found.");
            }
        } catch (error: any) {
            // If collection doesn't exist, this might throw.
            console.log("Error processing Mail indexes (collection might not exist):", error.message);
        }

        // Fix Visit Collection 
        try {
            console.log("Checking Visit indexes...");
            const visitCollection = db.collection('visits');
            const indexes = await visitCollection.indexes();
            console.log("Existing Visit indexes:", indexes.map(i => i.name));

            const visitIdIndex = indexes.find(i => i.name === 'visitId_1');
            if (visitIdIndex) {
                console.log("Found conflicting 'visitId_1' index. Dropping...");
                await visitCollection.dropIndex('visitId_1');
                console.log("Dropped 'visitId_1' index.");
            } else {
                console.log("No 'visitId_1' index found.");
            }
        } catch (error: any) {
            console.log("Error processing Visit indexes:", error.message);
        }

        console.log("Done. Exiting.");
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
};

fixIndexes();
