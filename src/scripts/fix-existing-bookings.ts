import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fixBookings() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log('Connected to DB successfully!');

        const BookingModel = mongoose.connection.db!.collection('bookings');
        const CoworkingSpaceModel = mongoose.connection.db!.collection('coworkingspaces');
        const VirtualOfficeModel = mongoose.connection.db!.collection('virtualoffices');
        const MeetingRoomModel = mongoose.connection.db!.collection('meetingrooms');

        const bookings = await BookingModel.find({ isDeleted: false }).toArray();
        console.log(`Found ${bookings.length} total bookings.`);

        let fixedCount = 0;
        for (const booking of bookings) {
            let space = null;
            const spaceId = booking.spaceId;
            const type = booking.type;

            if (type === 'CoworkingSpace') {
                space = await CoworkingSpaceModel.findOne({ _id: spaceId });
            } else if (type === 'VirtualOffice') {
                space = await VirtualOfficeModel.findOne({ _id: spaceId });
            } else if (type === 'MeetingRoom') {
                space = await MeetingRoomModel.findOne({ _id: spaceId });
            }

            if (space && space.partner) {
                if (booking.partner?.toString() !== space.partner.toString()) {
                    console.log(`Fixing Booking ${booking.bookingNumber || booking._id}: Mapping from ${booking.partner} to ${space.partner}`);
                    await BookingModel.updateOne(
                        { _id: booking._id },
                        { $set: { partner: space.partner } }
                    );
                    fixedCount++;
                }
            }
        }

        console.log(`\nFixed ${fixedCount} bookings.`);
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fixBookings();
