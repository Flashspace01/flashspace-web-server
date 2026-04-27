const mongoose = require('mongoose');
const TicketSchema = new mongoose.Schema({}, { strict: false });
const Ticket = mongoose.model('Ticket', TicketSchema, 'tickets');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/flash');
  const numbers = ['TKT26042418', 'TKT26043897', 'TKT26042653', 'TKT26042336'];
  const tickets = await Ticket.find({ ticketNumber: { $in: numbers } }).select('ticketNumber rating').lean();
  console.log(JSON.stringify(tickets, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
