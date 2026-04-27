import mongoose from 'mongoose';
import { TicketModel } from './src/flashspaceWeb/ticketModule/models/Ticket';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const uri = process.env.DB_URI;
        console.log("Connecting to:", uri);
        await mongoose.connect(uri!);
        console.log("Connected.");

        const count = await TicketModel.countDocuments();
        console.log("Total Tickets:", count);

        if (count > 0) {
            const latest = await TicketModel.findOne().sort({ createdAt: -1 });
            console.log("Latest Ticket:", latest?.ticketNumber, latest?.subject);
        }

        const collections = await mongoose.connection.db?.listCollections().toArray();
        console.log("Collections:", collections?.map(c => c.name));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
