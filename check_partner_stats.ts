import mongoose from 'mongoose';
import { BookingModel } from './src/flashspaceWeb/bookingModule/booking.model';

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/myapp');
        const stats = await BookingModel.aggregate([
            { $group: { _id: '$partner', count: { $sum: 1 } } }
        ]);
        console.log('START_STATS');
        stats.forEach(s => {
            console.log(`Partner: ${s._id} Count: ${s.count}`);
        });
        console.log('END_STATS');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
