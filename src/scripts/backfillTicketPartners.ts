/**
 * Backfill partner, spaceId, and spaceSnapshot on tickets that are missing it.
 *
 * Usage: ts-node src/scripts/backfillTicketPartners.ts
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose, { Types } from "mongoose";
import { TicketModel } from "../flashspaceWeb/ticketModule/models/Ticket";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import {
  SpacePortalSpaceModel,
} from "../flashspaceWeb/spacePortalModule/models/space.model";

const connect = async () => {
  if (!process.env.DB_URI) {
    throw new Error("DB_URI is not defined");
  }
  await mongoose.connect(process.env.DB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected to DB");
};

const run = async () => {
  const filter = { $or: [{ partner: { $exists: false } }, { partner: null }] };
  const tickets = await TicketModel.find(filter).lean();
  console.log(`Found ${tickets.length} tickets to backfill`);

  let updated = 0;
  for (const t of tickets) {
    let partner: Types.ObjectId | undefined;
    let spaceId: string | undefined = t.spaceId;
    let spaceSnapshot: any = t.spaceSnapshot;

    // Prefer booking to derive partner/space
    if (t.bookingId && Types.ObjectId.isValid(t.bookingId)) {
      const booking = await BookingModel.findById(t.bookingId).lean();
      if (booking) {
        partner = booking.partner as any;
        spaceId = spaceId || booking.spaceId?.toString();
        spaceSnapshot = spaceSnapshot || booking.spaceSnapshot;
      }
    }

    // Fallback: use spaceId to find partner
    if (!partner && spaceId) {
      const space = await SpacePortalSpaceModel.findOne({
        $or: [
          { _id: Types.ObjectId.isValid(spaceId) ? spaceId : undefined },
          { name: spaceId }, // legacy: stored name in spaceId
        ],
        isDeleted: { $in: [false, null] },
      }).lean();
      if (space) {
        partner = space.partner as any;
        spaceSnapshot = spaceSnapshot || {
          name: space.name,
          address: space.location,
          city: space.city,
        };
      }
    }

    if (!partner) continue;

    await TicketModel.updateOne(
      { _id: t._id },
      {
        $set: {
          partner,
          spaceId,
          spaceSnapshot,
        },
      }
    );
    updated++;
  }

  console.log(`Updated ${updated} tickets`);
};

connect()
  .then(() => run())
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("Backfill failed:", err);
    mongoose.disconnect();
    process.exit(1);
  });
