import mongoose from 'mongoose';
import { BookingModel } from './src/flashspaceWeb/bookingModule/booking.model';
import { VirtualOfficeModel } from './src/flashspaceWeb/virtualOfficeModule/virtualOffice.model';
import { CoworkingSpaceModel } from './src/flashspaceWeb/coworkingSpaceModule/coworkingSpace.model';
import { MeetingRoomModel } from './src/flashspaceWeb/meetingRoomModule/meetingRoom.model';

async function migrate() {
    try {
        await mongoose.connect('mongodb://localhost:27017/myapp');
        
        const bookings = await BookingModel.find({
            $or: [
                { partner: null },
                { partner: new mongoose.Types.ObjectId('6989ccdefc41b1c899d3cd33') }
            ]
        });

        console.log(`Found ${bookings.length} bookings to potentially migrate.`);

        for (const booking of bookings) {
            let spaceModel: any = null;
            const type = (booking.type || '').toLowerCase();
            
            if (type.includes('virtual')) spaceModel = VirtualOfficeModel;
            else if (type.includes('coworking')) spaceModel = CoworkingSpaceModel;
            else if (type.includes('meeting')) spaceModel = MeetingRoomModel;

            if (spaceModel && booking.spaceId) {
                const space = await spaceModel.findById(booking.spaceId);
                if (space && space.partner) {
                    console.log(`Updating booking ${booking.bookingNumber}: ${booking.partner} -> ${space.partner}`);
                    booking.partner = space.partner;
                    
                    // Also fix the type string if it's incorrect
                    if (type === 'virtual_office') booking.type = 'VirtualOffice';
                    if (type === 'coworking_space') booking.type = 'CoworkingSpace';
                    if (type === 'meeting_room') booking.type = 'MeetingRoom';
                    
                    await booking.save();
                } else {
                    console.log(`Could not find partner for booking ${booking.bookingNumber} (Space ID: ${booking.spaceId})`);
                }
            } else {
                 console.log(`Could not resolve space model for type: ${booking.type}`);
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
migrate();
