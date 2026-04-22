import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkLastTicket() {
    try {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log("Connected to DB");

        const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
        
        const lastTicket = await Ticket.findOne({}).sort({ createdAt: -1 });
        if (lastTicket) {
            console.log("LAST TICKET CREATED:");
            console.log({
                ticketNumber: lastTicket.get('ticketNumber'),
                partnerId: lastTicket.get('partnerId'),
                assignee: lastTicket.get('assignee'),
                bookingId: lastTicket.get('bookingId'),
                status: lastTicket.get('status'),
                createdAt: lastTicket.get('createdAt')
            });
        } else {
            console.log("No tickets found");
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLastTicket();
