/**
 * Space Portal consolidated seed
 * --------------------------------
 * Seeds a minimal but fully-linked dataset across:
 * - Users (admin, partner, support, customer)
 * - Spaces (owned by partner)
 * - Bookings (customer -> space, owned by partner)
 * - Tickets (linked to booking/space/partner) in both TicketModel and SupportTicketModel
 *
 * Run: npx ts-node src/scripts/seedSpacePortal.ts
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose, { Types } from "mongoose";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";
import {
  UserModel,
  UserRole,
  AuthProvider,
} from "../flashspaceWeb/authModule/models/user.model";
import {
  SpacePortalSpaceModel,
  SpacePortalSpaceStatus,
} from "../flashspaceWeb/spacePortalModule/models/space.model";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import { TicketModel, TicketPriority, TicketStatus, TicketCategory } from "../flashspaceWeb/ticketModule/models/Ticket";
import { SupportTicketModel } from "../flashspaceWeb/userDashboardModule/models/supportTicket.model";

const SEED_PASSWORD = process.env.SEED_PASSWORD || "SpacePortal@2026";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function seed() {
  if (!process.env.DB_URI) throw new Error("DB_URI not set");

  await mongoose.connect(process.env.DB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to DB");

  // Clear collections we'll touch
  await Promise.all([
    SpacePortalSpaceModel.deleteMany({}),
    BookingModel.deleteMany({}),
    TicketModel.deleteMany({}),
    SupportTicketModel.deleteMany({}),
  ]);

  const hashed = await PasswordUtil.hash(SEED_PASSWORD);

  // Users
  const [admin, partner, support, customer, customer2] = await Promise.all([
    UserModel.findOneAndUpdate(
      { email: "admin@flashspace.ai" },
      {
        $set: {
          email: "admin@flashspace.ai",
          fullName: "Flashspace Admin",
          password: hashed,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true }
    ),
    UserModel.findOneAndUpdate(
      { email: "partner@flashspace.ai" },
      {
        $set: {
          email: "partner@flashspace.ai",
          fullName: "Space Partner",
          password: hashed,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.PARTNER,
          isEmailVerified: true,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true }
    ),
    UserModel.findOneAndUpdate(
      { email: "support@flashspace.ai" },
      {
        $set: {
          email: "support@flashspace.ai",
          fullName: "Support Agent",
          password: hashed,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true }
    ),
    UserModel.findOneAndUpdate(
      { email: "customer@flashspace.ai" },
      {
        $set: {
          email: "customer@flashspace.ai",
          fullName: "Test Customer",
          password: hashed,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.USER,
          isEmailVerified: true,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true }
    ),
    UserModel.findOneAndUpdate(
      { email: "customer2@flashspace.ai" },
      {
        $set: {
          email: "customer2@flashspace.ai",
          fullName: "Second Customer",
          password: hashed,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.USER,
          isEmailVerified: true,
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true, new: true }
    ),
  ]);

  // Spaces (owned by partner)
  const spaces = await SpacePortalSpaceModel.insertMany([
    {
      name: "Harbor Point Workspace",
      city: "San Francisco",
      location: "Market St, SoMa",
      totalSeats: 120,
      availableSeats: 20,
      meetingRooms: 6,
      cabins: 12,
      status: SpacePortalSpaceStatus.ACTIVE,
      partner: partner._id,
    },
    {
      name: "Indiranagar Tech Hub",
      city: "Bangalore",
      location: "Indiranagar Main Rd",
      totalSeats: 90,
      availableSeats: 35,
      meetingRooms: 5,
      cabins: 9,
      status: SpacePortalSpaceStatus.ACTIVE,
      partner: partner._id,
    },
  ]);

  // Bookings (customer -> space, owned by partner)
  const bookings = await BookingModel.insertMany([
    {
      bookingNumber: "BK-SP-1001",
      user: customer._id,
      partner: partner._id,
      type: "coworking_space",
      spaceId: spaces[0]._id.toString(),
      spaceSnapshot: {
        name: spaces[0].name,
        address: spaces[0].location,
        city: spaces[0].city,
      },
      plan: { name: "Team Space", price: 3200, tenure: 12, tenureUnit: "months" },
      status: "active",
      kycStatus: "approved",
      startDate: daysAgo(30),
      endDate: daysFromNow(335),
      features: ["24/7 Access", "Mail Handling"],
    },
    {
      bookingNumber: "BK-SP-1002",
      user: customer._id,
      partner: partner._id,
      type: "virtual_office",
      spaceId: spaces[1]._id.toString(),
      spaceSnapshot: {
        name: spaces[1].name,
        address: spaces[1].location,
        city: spaces[1].city,
      },
      plan: { name: "Virtual Office Premium", price: 1200, tenure: 6, tenureUnit: "months" },
      status: "pending_kyc",
      kycStatus: "pending",
      startDate: daysAgo(5),
      endDate: daysFromNow(175),
      features: ["Business Address", "Mail Forwarding"],
    },
    {
      bookingNumber: "BK-SP-1003",
      user: customer2._id,
      partner: partner._id,
      type: "coworking_space",
      spaceId: spaces[1]._id.toString(),
      spaceSnapshot: {
        name: spaces[1].name,
        address: spaces[1].location,
        city: spaces[1].city,
      },
      plan: { name: "Hot Desk Monthly", price: 800, tenure: 3, tenureUnit: "months" },
      status: "active",
      kycStatus: "approved",
      startDate: daysAgo(10),
      endDate: daysFromNow(80),
      features: ["Phone Booths", "Snacks"],
    },
  ]);

  // Tickets (linked to booking/space/partner)
  const ticketDocs = [
    {
      ticketNumber: "TKT-SP-9001",
      subject: "Access card not working",
      description: "My access card stopped working yesterday evening.",
      user: customer._id,
      partner: partner._id,
      bookingId: bookings[0]._id.toString(),
      spaceId: spaces[0]._id.toString(),
      spaceSnapshot: {
        name: spaces[0].name,
        address: spaces[0].location,
        city: spaces[0].city,
      },
      category: TicketCategory.TECHNICAL,
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      messages: [
        { sender: "user", message: "Card stopped working.", createdAt: daysAgo(1) },
        { sender: "support", message: "We are resetting access.", createdAt: daysAgo(1) },
      ],
      assignee: support._id,
    },
    {
      ticketNumber: "TKT-SP-9002",
      subject: "Invoice mismatch",
      description: "Invoice total looks higher than expected.",
      user: customer._id,
      partner: partner._id,
      bookingId: bookings[1]._id.toString(),
      spaceId: spaces[1]._id.toString(),
      spaceSnapshot: {
        name: spaces[1].name,
        address: spaces[1].location,
        city: spaces[1].city,
      },
      category: TicketCategory.BILLING,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      messages: [{ sender: "user", message: "Please review charges.", createdAt: daysAgo(2) }],
    },
    {
      ticketNumber: "TKT-SP-9003",
      subject: "Need extra access cards",
      description: "Requesting two additional cards for new hires.",
      user: customer._id,
      partner: partner._id,
      bookingId: bookings[0]._id.toString(),
      spaceId: spaces[0]._id.toString(),
      spaceSnapshot: {
        name: spaces[0].name,
        address: spaces[0].location,
        city: spaces[0].city,
      },
      category: TicketCategory.OTHER,
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      messages: [{ sender: "user", message: "Need 2 more cards.", createdAt: daysAgo(3) }],
    },
    {
      ticketNumber: "TKT-SP-9004",
      subject: "Wifi intermittently dropping",
      description: "Wifi drops every hour in Indiranagar Tech Hub.",
      user: customer2._id,
      partner: partner._id,
      bookingId: bookings[2]._id.toString(),
      spaceId: spaces[1]._id.toString(),
      spaceSnapshot: {
        name: spaces[1].name,
        address: spaces[1].location,
        city: spaces[1].city,
      },
      category: TicketCategory.TECHNICAL,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      messages: [
        { sender: "user", message: "Wifi keeps dropping.", createdAt: daysAgo(1) },
        { sender: "support", message: "Checking routers now.", createdAt: daysAgo(1) },
      ],
      assignee: support._id,
    },
  ];

  await TicketModel.insertMany(ticketDocs);
  await SupportTicketModel.insertMany(
    ticketDocs.map((t) => ({
      ticketNumber: t.ticketNumber,
      user: t.user,
      bookingId: t.bookingId,
      subject: t.subject,
      category: t.category,
      priority: t.priority?.toLowerCase?.() || "medium",
      status: t.status?.toLowerCase?.() || "open",
      messages: (t.messages || []).map((m) => ({
        sender: m.sender === "support" ? "support" : "user",
        senderName: m.sender === "support" ? "Support" : "Customer",
        senderId: m.sender === "support" ? support._id : customer._id,
        message: m.message,
        createdAt: m.createdAt,
      })),
      assignedTo: t.assignee,
      partner: t.partner,
    }))
  );

  console.log("\n✅ Space Portal seed complete");
  console.log(`Users: admin=${admin.email}, partner=${partner.email}, support=${support.email}, customer=${customer.email}`);
  console.log(`Spaces: ${spaces.length}`);
  console.log(`Bookings: ${bookings.length}`);
  console.log(`Tickets: ${ticketDocs.length}`);
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("Seed error:", err);
    mongoose.disconnect();
    process.exit(1);
  });
