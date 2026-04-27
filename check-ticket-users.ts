import mongoose from 'mongoose';
import { TicketModel } from './src/flashspaceWeb/ticketModule/models/Ticket';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.DB_URI!);
        const tickets = await TicketModel.find({}).populate('user').lean();
        tickets.forEach(t => {
            console.log(`Ticket: ${t.ticketNumber}, User: ${t.user ? (t.user as any).email : 'MISSING'}`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
