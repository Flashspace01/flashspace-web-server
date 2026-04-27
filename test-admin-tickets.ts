import mongoose from 'mongoose';
import { TicketService } from './src/flashspaceWeb/ticketModule/services/ticket.service';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.DB_URI!);
        console.log("Connected.");

        const result = await TicketService.getAllTickets({}, 1, 20);
        console.log("Admin Tickets Count:", result.tickets.length);
        console.log("First Ticket:", result.tickets[0]?.ticketNumber);

        await mongoose.disconnect();
    } catch (err) {
        console.error("FAILED:", err);
    }
}

test();
