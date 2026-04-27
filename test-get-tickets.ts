import mongoose from 'mongoose';
import { TicketService } from './src/flashspaceWeb/ticketModule/services/ticket.service';
import dotenv from 'dotenv';

dotenv.config();

async function testGetTickets() {
  try {
    await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
    console.log('Connected to MongoDB');

    const partnerId = '69e7147c2a4818e6280cad8f'; // Pratik Dey
    const result = await TicketService.getPartnerTickets(partnerId);

    console.log(`Found ${result.tickets.length} tickets for partner.`);
    result.tickets.forEach(t => {
      console.log(` - ${t.ticketNumber}: ${t.subject} (Status: ${t.status}, Assignee: ${t.assignee?.fullName})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGetTickets();
