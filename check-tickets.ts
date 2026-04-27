import mongoose from 'mongoose';
import { TicketModel } from './src/flashspaceWeb/ticketModule/models/Ticket';
import { UserModel } from './src/flashspaceWeb/authModule/models/user.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkTickets() {
  try {
    await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
    console.log('Connected to MongoDB');

    const tickets = await TicketModel.find({ 
      assignee: { $ne: null },
      status: 'in_progress'
    }).populate('assignee', 'fullName role email').lean();

    console.log(`Found ${tickets.length} in-progress tickets with assignees.`);
    
    tickets.forEach(t => {
      console.log(`Ticket ${t.ticketNumber}:`);
      console.log(` - Subject: ${t.subject}`);
      console.log(` - Assignee: ${t.assignee?.fullName} (${t.assignee?._id})`);
      console.log(` - PartnerId: ${t.partnerId}`);
      console.log(` - ChatType: ${t.chatType}`);
      console.log('-------------------');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTickets();
