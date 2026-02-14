
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { TicketService } from '../flashspaceWeb/ticketModule/services/ticket.service';
import { TicketCategory, TicketPriority } from '../flashspaceWeb/ticketModule/models/Ticket';
import { NotificationModel } from '../flashspaceWeb/notificationModule/models/Notification';
import { UserModel } from '../flashspaceWeb/authModule/models/user.model';

const runTest = async () => {
    try {
        console.log("Connecting to DB...");
        if (!process.env.DB_URI) throw new Error("No DB_URI in .env");
        await mongoose.connect(process.env.DB_URI);

        // 1. Find a user to act as the ticket creator
        const user = await UserModel.findOne();
        if (!user) {
            console.warn("⚠️ No users found in DB. Cannot fully test TicketService.");
            process.exit(0);
        }
        console.log(`Using User: ${user.email} (${user._id})`);

        // 2. Create a Ticket
        console.log("Creating ticket...");
        const ticket = await TicketService.createTicket(user._id.toString(), {
            subject: "Phase 2 Test Ticket",
            description: "Testing notification injection",
            category: TicketCategory.TECHNICAL,
            priority: TicketPriority.HIGH
        });
        console.log("Ticket Created:", ticket.ticketNumber);

        // 3. Check for Notification
        console.log("Checking for Admin Notification...");
        // Allow a slight delay for async nature (though await should handle it)
        await new Promise(r => setTimeout(r, 1000));

        const notification = await NotificationModel.findOne({
            type: 'INFO',
            title: `New Ticket: ${ticket.ticketNumber}`,
            recipientType: 'ADMIN'
        });

        if (notification) {
            console.log("✅ SUCCESS: Admin Notification found in DB!");
            console.log(`   - Title: ${notification.title}`);
            console.log(`   - Message: ${notification.message}`);
        } else {
            console.error("❌ FAILURE: Notification not found in DB.");
        }

        process.exit(0);

    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
};

runTest();
