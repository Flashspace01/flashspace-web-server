import mongoose from 'mongoose';
import { TicketModel } from './src/flashspaceWeb/ticketModule/models/Ticket';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const atlasUri = "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/";
        console.log("Connecting to Atlas...");
        await mongoose.connect(atlasUri);
        console.log("Connected to Atlas.");

        const count = await TicketModel.countDocuments();
        console.log("Atlas Tickets Count:", count);

        await mongoose.disconnect();
    } catch (err) {
        console.error("Atlas connection failed:", err);
    }
}

check();
