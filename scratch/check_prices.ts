
import mongoose from 'mongoose';
import { CoworkingSpaceModel } from '../src/flashspaceWeb/coworkingSpaceModule/coworkingSpace.model';
import { PaymentModel } from '../src/flashspaceWeb/paymentModule/payment.model';
import { BookingModel } from '../src/flashspaceWeb/bookingModule/booking.model';
import { VirtualOfficeModel } from '../src/flashspaceWeb/virtualOfficeModule/virtualOffice.model';

async function checkData() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/flash');
    console.log('Connected to MongoDB');

    const lastPayment = await PaymentModel.findOne().sort({ createdAt: -1 });
    console.log('--- Last Payment ---');
    console.log(JSON.stringify(lastPayment, null, 2));

    const lastBooking = await BookingModel.findOne().sort({ createdAt: -1 });
    console.log('--- Last Booking ---');
    console.log(JSON.stringify(lastBooking, null, 2));

    if (lastPayment && lastPayment.space) {
        const space = await CoworkingSpaceModel.findById(lastPayment.space);
        console.log('--- Associated Coworking Space ---');
        console.log(JSON.stringify(space, null, 2));

        const vo = await VirtualOfficeModel.findById(lastPayment.space);
        if (vo) {
            console.log('--- Associated Virtual Office ---');
            console.log(JSON.stringify(vo, null, 2));
        }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();
