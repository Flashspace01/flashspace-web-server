import mongoose from 'mongoose';
import { TicketService } from './src/flashspaceWeb/ticketModule/services/ticket.service';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.DB_URI!);
        console.log("Connected.");

        const result = await TicketService.getTicketStats();
        console.log("Stats:", JSON.stringify(result, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error("FAILED:", err);
    }
}

test();
