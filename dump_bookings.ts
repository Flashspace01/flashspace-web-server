import mongoose from 'mongoose';
import { BookingModel } from './src/flashspaceWeb/bookingModule/booking.model';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const bookings = await BookingModel.find({}).populate('spaceId').lean();
    console.log("Total Bookings:", bookings.length);
    for (const b of bookings) {
        if (b.spaceSnapshot?.city?.toLowerCase() === 'bangalore' || b.plan?.tenure === 3) {
            console.log(JSON.stringify(b.plan, null, 2));
            console.log("Tenure:", b.plan?.tenure, b.plan?.tenureUnit);
        }
    }
    mongoose.disconnect();
}
main();
