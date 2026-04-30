import mongoose from "mongoose";
import dotenv from "dotenv";
import { TicketModel, TicketStatus } from "../flashspaceWeb/ticketModule/models/Ticket";
import { SupportTicketModel } from "../flashspaceWeb/userDashboardModule/models/supportTicket.model";

dotenv.config();

const migrate = async () => {
  try {
    const mongoUri = process.env.DB_URI || "mongodb://127.0.0.1:27017/flash";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    console.log("Migrating TicketModel...");
    const result1 = await TicketModel.updateMany(
      { status: "closed" as any },
      [
        {
          $set: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { $ifNull: ["$resolvedAt", "$closedAt"] }
          }
        },
        { $unset: "closedAt" }
      ]
    );
    console.log(`Updated ${result1.modifiedCount} tickets in TicketModel`);

    console.log("Migrating SupportTicketModel...");
    const result2 = await SupportTicketModel.updateMany(
      { status: "closed" as any },
      [
        {
          $set: {
            status: "resolved",
            resolvedAt: { $ifNull: ["$resolvedAt", "$closedAt"] }
          }
        },
        { $unset: "closedAt" }
      ]
    );
    console.log(`Updated ${result2.modifiedCount} tickets in SupportTicketModel`);

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
