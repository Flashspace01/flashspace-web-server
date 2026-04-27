import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkIds() {
    try {
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log("Connected to DB");

        const User = mongoose.model('User', new mongoose.Schema({ email: String, fullName: String, role: String }));
        const Booking = mongoose.model('Booking', new mongoose.Schema({ bookingNumber: String, partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }));
        const Property = mongoose.model('Property', new mongoose.Schema({ name: String, partner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }));

        const pratik = await User.findOne({ email: /team@stirringminds.com/i });
        console.log("Pratik Dey (team@stirringminds.com) User ID:", pratik ? pratik._id : "NOT FOUND");

        const suspiciousId = '69e0ba90ffbd9962e51008e2';
        const suspiciousUser = await User.findById(suspiciousId);
        console.log(`Checking Suspicious ID ${suspiciousId}:`, suspiciousUser ? `FOUND (${suspiciousUser.email})` : "NOT FOUND");

        const stirringProperty = await Property.findOne({ name: /Stirring Minds/i });
        console.log("Stirring Minds Property Partner ID:", stirringProperty ? stirringProperty.partner : "NOT FOUND");

        const Space = mongoose.model('VirtualOffice', new mongoose.Schema({ name: String, partner: mongoose.Schema.Types.ObjectId, property: mongoose.Schema.Types.ObjectId }));
        const propRecord = await Property.findById('69e0ba91ffbd9962e51009a4').lean();
        console.log(`\nProperty 69e0ba91ffbd9962e51009a4 found:`, propRecord ? JSON.stringify(propRecord, null, 2) : "NOT FOUND");

        const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(5);
        console.log("\nRecent Bookings (Number | Partner ID):");
        bookings.forEach(b => console.log(`${b.bookingNumber} | ${b.partner}`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkIds();
