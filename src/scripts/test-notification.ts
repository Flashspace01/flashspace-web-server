
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { NotificationService } from '../flashspaceWeb/notificationModule/services/notification.service';
import { NotificationType } from '../flashspaceWeb/notificationModule/models/Notification';
import { initSocket } from '../socket';
import http from 'http';

const runTest = async () => {
    try {
        console.log("Connecting to DB...");
        if (!process.env.DB_URI) throw new Error("No DB_URI in .env");
        await mongoose.connect(process.env.DB_URI);
        console.log("Connected to DB");

        // Mock Socket Implementation for testing without full server
        // In a real running server, getIO() works. 
        // Here we just want to test DB persistence mostly, or we'd need to spin up a server.
        console.log("Creating Test Notification...");

        // 1. Test Admin Notification
        const adminNotif = await NotificationService.notifyAdmin(
            "Test Admin Alert",
            "This is a test notification from the verification script.",
            NotificationType.WARNING
        );
        console.log("✅ Admin Notification Created:", adminNotif._id);

        // 2. Test User Notification (Use a fake user ID)
        const fakeUserId = "65c3f3f3f3f3f3f3f3f3f3f3";
        const userNotif = await NotificationService.notifyUser(
            fakeUserId,
            "Test User Message",
            "Hello User! Your booking is confirmed.",
            NotificationType.SUCCESS
        );
        console.log("✅ User Notification Created:", userNotif._id);

        console.log("Phase 1 Verification Successful: DB persistence works.");
        console.log("Socket emission would happen here if server was fully listening.");

        process.exit(0);

    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
};

runTest();
