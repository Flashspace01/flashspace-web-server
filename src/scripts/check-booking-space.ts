import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkBookingSpace() {
    try {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log("Connected to DB");

        const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
        const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
        
        const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId('69e74c184337d66c53706621') });
        console.log("BOOKING DATA:");
        console.log(booking);

        if (booking && booking.get('spaceId')) {
            const sid = booking.get('spaceId');
            console.log("Space ID from Booking:", sid);
            const property = await Property.findById(sid);
            console.log("PROPERTY DATA:");
            console.log(property);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkBookingSpace();
