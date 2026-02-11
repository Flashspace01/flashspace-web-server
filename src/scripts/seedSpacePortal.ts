console.log("Starting space portal seed script...");
import mongoose from "mongoose";
import dotenv from "dotenv";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";
import {
  AuthProvider,
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import {
  SpacePortalSpaceModel,
  SpacePortalSpaceStatus,
} from "../flashspaceWeb/spacePortalModule/models/space.model";
import {
  ClientPlan,
  ClientStatus,
  KycStatus,
  SpacePortalClientModel,
} from "../flashspaceWeb/spacePortalModule/models/client.model";
import {
  ClientKycDocumentType,
  ClientKycStatus,
  SpacePortalClientKycModel,
} from "../flashspaceWeb/spacePortalModule/models/clientKyc.model";
import {
  ClientAgreementStatus,
  SpacePortalClientAgreementModel,
} from "../flashspaceWeb/spacePortalModule/models/clientAgreement.model";
import {
  ClientBookingStatus,
  SpacePortalClientBookingModel,
} from "../flashspaceWeb/spacePortalModule/models/clientBookings.model";
import {
  ClientInvoiceStatus,
  SpacePortalClientInvoiceModel,
} from "../flashspaceWeb/spacePortalModule/models/clientInvoice.model";
import {
  CalendarBookingStatus,
  SpacePortalCalendarBookingModel,
} from "../flashspaceWeb/spacePortalModule/models/calendarBooking.model";
import {
  BookingRequestStatus,
  SpacePortalBookingRequestModel,
} from "../flashspaceWeb/spacePortalModule/models/bookingRequest.model";
import {
  EnquiryStatus,
  SpacePortalEnquiryModel,
} from "../flashspaceWeb/spacePortalModule/models/enquiry.model";
import { SpacePortalNotificationModel } from "../flashspaceWeb/spacePortalModule/models/notification.model";
import { SpacePortalNotificationPreferenceModel } from "../flashspaceWeb/spacePortalModule/models/notificationPreference.model";
import { SpacePortalProfileModel } from "../flashspaceWeb/spacePortalModule/models/profile.model";
import { InvoiceModel } from "../flashspaceWeb/userDashboardModule/models/invoice.model";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import { SupportTicketModel } from "../flashspaceWeb/userDashboardModule/models/supportTicket.model";

dotenv.config();

const SEED_PASSWORD = process.env.SEED_PASSWORD || "SpacePortal@2026";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const withTime = (date: Date, hour: number, minute = 0) => {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
};
const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

async function seedSpacePortal() {
  try {
    if (!process.env.DB_URI) {
      throw new Error("DB_URI is not defined in environment variables");
    }

    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to database successfully!");

    const hashedPassword = await PasswordUtil.hash(SEED_PASSWORD);

    const [adminUser, supportUser] = await Promise.all([
      UserModel.findOneAndUpdate(
        { email: "spaceportal.admin@flashspace.ai" },
        {
          $set: {
            email: "spaceportal.admin@flashspace.ai",
            fullName: "Space Portal Admin",
            phoneNumber: "+1-415-555-0100",
            password: hashedPassword,
            authProvider: AuthProvider.LOCAL,
            role: UserRole.ADMIN,
            isEmailVerified: true,
            isActive: true,
            isDeleted: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ),
      UserModel.findOneAndUpdate(
        { email: "spaceportal.support@flashspace.ai" },
        {
          $set: {
            email: "spaceportal.support@flashspace.ai",
            fullName: "Space Portal Support",
            phoneNumber: "+1-312-555-0188",
            password: hashedPassword,
            authProvider: AuthProvider.LOCAL,
            role: UserRole.ADMIN,
            isEmailVerified: true,
            isActive: true,
            isDeleted: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ),
    ]);

    if (!adminUser || !supportUser) {
      throw new Error("Failed to upsert seed users");
    }

    const spaces = [
      {
        name: "Harbor Point Workspace",
        city: "San Francisco",
        location: "Market St, SoMa",
        totalSeats: 120,
        availableSeats: 28,
        meetingRooms: 6,
        cabins: 12,
        status: SpacePortalSpaceStatus.ACTIVE,
      },
      {
        name: "Lakeview Flex Hub",
        city: "Chicago",
        location: "Wacker Dr, Loop",
        totalSeats: 80,
        availableSeats: 12,
        meetingRooms: 4,
        cabins: 8,
        status: SpacePortalSpaceStatus.ACTIVE,
      },
      {
        name: "Austin Central Labs",
        city: "Austin",
        location: "Congress Ave, Downtown",
        totalSeats: 60,
        availableSeats: 0,
        meetingRooms: 3,
        cabins: 6,
        status: SpacePortalSpaceStatus.MAINTENANCE,
      },
    ];

    await SpacePortalSpaceModel.deleteMany({
      name: { $in: spaces.map((space) => space.name) },
    });
    const insertedSpaces = await SpacePortalSpaceModel.insertMany(spaces);

    const clients = [
      {
        companyName: "Acme Robotics",
        contactName: "Jordan Lee",
        email: "jordan.lee@acmerobotics.com",
        phone: "+1-415-555-0198",
        plan: ClientPlan.TEAM_SPACE,
        space: "Harbor Point Workspace",
        startDate: daysAgo(75),
        endDate: daysFromNow(290),
        status: ClientStatus.ACTIVE,
        kycStatus: KycStatus.VERIFIED,
      },
      {
        companyName: "Nimbus Analytics",
        contactName: "Priya Shah",
        email: "priya@nimbusanalytics.com",
        phone: "+1-312-555-0142",
        plan: ClientPlan.VIRTUAL_OFFICE_PREMIUM,
        space: "Lakeview Flex Hub",
        startDate: daysAgo(40),
        endDate: daysFromNow(12),
        status: ClientStatus.EXPIRING_SOON,
        kycStatus: KycStatus.PENDING,
      },
      {
        companyName: "Greenleaf Labs",
        contactName: "Carlos Diaz",
        email: "carlos@greenleaflabs.com",
        phone: "+1-512-555-0175",
        plan: ClientPlan.HOT_DESK_MONTHLY,
        space: "Austin Central Labs",
        startDate: daysAgo(180),
        endDate: daysAgo(5),
        status: ClientStatus.INACTIVE,
        kycStatus: KycStatus.VERIFIED,
      },
    ];

    await SpacePortalClientModel.deleteMany({
      email: { $in: clients.map((client) => client.email) },
    });
    const insertedClients = await SpacePortalClientModel.insertMany(clients);
    const clientByCompany = new Map(
      insertedClients.map((client) => [client.companyName, client])
    );

    const kycSeeds = [
      {
        company: "Acme Robotics",
        status: ClientKycStatus.VERIFIED,
        documents: [
          {
            type: ClientKycDocumentType.PAN,
            fileUrl: "https://example.com/kyc/acme-pan.pdf",
            uploadedAt: daysAgo(60),
          },
          {
            type: ClientKycDocumentType.GST,
            fileUrl: "https://example.com/kyc/acme-gst.pdf",
            uploadedAt: daysAgo(58),
          },
        ],
      },
      {
        company: "Nimbus Analytics",
        status: ClientKycStatus.PENDING,
        documents: [
          {
            type: ClientKycDocumentType.PAN,
            fileUrl: "https://example.com/kyc/nimbus-pan.pdf",
            uploadedAt: daysAgo(15),
          },
        ],
      },
      {
        company: "Greenleaf Labs",
        status: ClientKycStatus.VERIFIED,
        documents: [
          {
            type: ClientKycDocumentType.AADHAR,
            fileUrl: "https://example.com/kyc/greenleaf-aadhar.pdf",
            uploadedAt: daysAgo(150),
          },
        ],
      },
    ];

    await SpacePortalClientKycModel.deleteMany({
      client: { $in: insertedClients.map((client) => client._id) },
    });

    await SpacePortalClientKycModel.insertMany(
      kycSeeds.map((seed) => {
        const client = clientByCompany.get(seed.company);
        if (!client) {
          throw new Error(`Client not found for KYC seed: ${seed.company}`);
        }
        return {
          client: client._id,
          status: seed.status,
          documents: seed.documents,
        };
      })
    );

    const agreementSeeds = [
      {
        company: "Acme Robotics",
        status: ClientAgreementStatus.SIGNED,
        agreementUrl: "https://example.com/agreements/acme.pdf",
        signedAt: daysAgo(70),
        validTill: daysFromNow(290),
      },
      {
        company: "Nimbus Analytics",
        status: ClientAgreementStatus.PENDING,
        agreementUrl: "https://example.com/agreements/nimbus.pdf",
      },
      {
        company: "Greenleaf Labs",
        status: ClientAgreementStatus.EXPIRED,
        agreementUrl: "https://example.com/agreements/greenleaf.pdf",
        signedAt: daysAgo(170),
        validTill: daysAgo(10),
      },
    ];

    await SpacePortalClientAgreementModel.deleteMany({
      client: { $in: insertedClients.map((client) => client._id) },
    });
    await SpacePortalClientAgreementModel.insertMany(
      agreementSeeds.map((seed) => {
        const client = clientByCompany.get(seed.company);
        if (!client) {
          throw new Error(`Client not found for agreement seed: ${seed.company}`);
        }
        return {
          client: client._id,
          status: seed.status,
          agreementUrl: seed.agreementUrl,
          signedAt: seed.signedAt,
          validTill: seed.validTill,
        };
      })
    );

    const clientBookingsSeeds = [
      {
        company: "Acme Robotics",
        date: daysAgo(3),
        slot: "09:00-12:00",
        status: ClientBookingStatus.CONFIRMED,
        amount: 450,
      },
      {
        company: "Acme Robotics",
        date: daysFromNow(5),
        slot: "14:00-17:00",
        status: ClientBookingStatus.PENDING,
        amount: 450,
      },
      {
        company: "Nimbus Analytics",
        date: daysFromNow(2),
        slot: "10:00-13:00",
        status: ClientBookingStatus.CONFIRMED,
        amount: 300,
      },
      {
        company: "Greenleaf Labs",
        date: daysAgo(30),
        slot: "11:00-12:00",
        status: ClientBookingStatus.CANCELLED,
        amount: 120,
      },
    ];

    await SpacePortalClientBookingModel.deleteMany({
      client: { $in: insertedClients.map((client) => client._id) },
    });
    await SpacePortalClientBookingModel.insertMany(
      clientBookingsSeeds.map((seed) => {
        const client = clientByCompany.get(seed.company);
        if (!client) {
          throw new Error(`Client not found for booking seed: ${seed.company}`);
        }
        return {
          client: client._id,
          date: seed.date,
          slot: seed.slot,
          status: seed.status,
          amount: seed.amount,
        };
      })
    );

    const clientInvoiceSeeds = [
      {
        company: "Acme Robotics",
        invoiceNumber: "SPC-INV-0001",
        amount: 3200,
        status: ClientInvoiceStatus.PAID,
        pdfUrl: "https://example.com/invoices/spc-inv-0001.pdf",
        createdAt: daysAgo(20),
      },
      {
        company: "Nimbus Analytics",
        invoiceNumber: "SPC-INV-0002",
        amount: 1200,
        status: ClientInvoiceStatus.PENDING,
        pdfUrl: "https://example.com/invoices/spc-inv-0002.pdf",
        createdAt: daysAgo(5),
      },
      {
        company: "Greenleaf Labs",
        invoiceNumber: "SPC-INV-0003",
        amount: 800,
        status: ClientInvoiceStatus.OVERDUE,
        pdfUrl: "https://example.com/invoices/spc-inv-0003.pdf",
        createdAt: daysAgo(50),
      },
    ];

    await SpacePortalClientInvoiceModel.deleteMany({
      invoiceNumber: { $in: clientInvoiceSeeds.map((seed) => seed.invoiceNumber) },
    });
    await SpacePortalClientInvoiceModel.insertMany(
      clientInvoiceSeeds.map((seed) => {
        const client = clientByCompany.get(seed.company);
        if (!client) {
          throw new Error(`Client not found for invoice seed: ${seed.company}`);
        }
        return {
          client: client._id,
          invoiceNumber: seed.invoiceNumber,
          amount: seed.amount,
          status: seed.status,
          pdfUrl: seed.pdfUrl,
          createdAt: seed.createdAt,
        };
      })
    );

    const bookingRequests = [
      {
        clientName: "Oak & Co",
        space: "Harbor Point Workspace",
        requestedDate: daysFromNow(7),
        requestedTime: "10:00-12:00",
        status: BookingRequestStatus.PENDING,
      },
      {
        clientName: "Nimbus Analytics",
        space: "Lakeview Flex Hub",
        requestedDate: daysFromNow(4),
        requestedTime: "15:00-17:00",
        status: BookingRequestStatus.APPROVED,
      },
      {
        clientName: "Greenleaf Labs",
        space: "Austin Central Labs",
        requestedDate: daysAgo(2),
        requestedTime: "09:00-10:00",
        status: BookingRequestStatus.DECLINED,
      },
    ];

    await SpacePortalBookingRequestModel.deleteMany({
      clientName: { $in: bookingRequests.map((seed) => seed.clientName) },
    });
    const insertedRequests = await SpacePortalBookingRequestModel.insertMany(
      bookingRequests
    );

    const calendarBookings = [
      {
        clientName: "Acme Robotics",
        space: "Harbor Point Workspace",
        startTime: withTime(daysFromNow(1), 10),
        endTime: addHours(withTime(daysFromNow(1), 10), 2),
        planName: "Team Space",
        amount: 600,
        status: CalendarBookingStatus.CONFIRMED,
        createdAt: daysAgo(2),
      },
      {
        clientName: "Nimbus Analytics",
        space: "Lakeview Flex Hub",
        startTime: withTime(daysFromNow(3), 14),
        endTime: addHours(withTime(daysFromNow(3), 14), 2),
        planName: "Virtual Office Premium",
        amount: 250,
        status: CalendarBookingStatus.PENDING,
        createdAt: daysAgo(1),
      },
      {
        clientName: "Greenleaf Labs",
        space: "Austin Central Labs",
        startTime: withTime(daysAgo(15), 9),
        endTime: addHours(withTime(daysAgo(15), 9), 2),
        planName: "Hot Desk Monthly",
        amount: 200,
        status: CalendarBookingStatus.CANCELLED,
        createdAt: daysAgo(15),
      },
      {
        clientName: "Acme Robotics",
        space: "Harbor Point Workspace",
        startTime: withTime(daysAgo(40), 13),
        endTime: addHours(withTime(daysAgo(40), 13), 2),
        planName: "Team Space",
        amount: 700,
        status: CalendarBookingStatus.CONFIRMED,
        createdAt: daysAgo(40),
      },
      {
        clientName: "Nimbus Analytics",
        space: "Lakeview Flex Hub",
        startTime: withTime(daysAgo(75), 11),
        endTime: addHours(withTime(daysAgo(75), 11), 2),
        planName: "Virtual Office Premium",
        amount: 300,
        status: CalendarBookingStatus.CONFIRMED,
        createdAt: daysAgo(75),
      },
    ];

    await SpacePortalCalendarBookingModel.deleteMany({
      clientName: { $in: calendarBookings.map((seed) => seed.clientName) },
    });
    const insertedCalendarBookings =
      await SpacePortalCalendarBookingModel.insertMany(calendarBookings);

    const enquiries = [
      {
        clientName: "Sophia Reed",
        companyName: "Reed Ventures",
        phone: "+1-415-555-0102",
        email: "sophia@reedventures.com",
        requestedPlan: "Team Space",
        requestedSpace: "Harbor Point Workspace",
        status: EnquiryStatus.NEW,
      },
      {
        clientName: "Karan Patel",
        companyName: "Brightline Media",
        phone: "+1-312-555-0113",
        email: "karan@brightlinemedia.com",
        requestedPlan: "Virtual Office Premium",
        requestedSpace: "Lakeview Flex Hub",
        status: EnquiryStatus.IN_PROGRESS,
      },
      {
        clientName: "Emily Zhang",
        companyName: "Northwind Health",
        phone: "+1-512-555-0127",
        email: "emily@northwindhealth.com",
        requestedPlan: "Hot Desk Monthly",
        requestedSpace: "Austin Central Labs",
        status: EnquiryStatus.CONVERTED,
      },
    ];

    await SpacePortalEnquiryModel.deleteMany({
      email: { $in: enquiries.map((seed) => seed.email) },
    });
    const insertedEnquiries = await SpacePortalEnquiryModel.insertMany(enquiries);

    await SpacePortalNotificationModel.deleteMany({ user: adminUser._id });
    const notifications = [
      {
        user: adminUser._id,
        title: "New booking request",
        description:
          "Nimbus Analytics requested a booking for Lakeview Flex Hub.",
        time: "2h ago",
        read: false,
        href: "/spaceportal/bookings/requests",
        isNew: true,
      },
      {
        user: adminUser._id,
        title: "Invoice payment received",
        description: "Acme Robotics paid SPC-INV-0001.",
        time: "1d ago",
        read: true,
        href: "/spaceportal/invoices",
        isNew: false,
      },
      {
        user: adminUser._id,
        title: "KYC verification pending",
        description: "Nimbus Analytics submitted a PAN document.",
        time: "3d ago",
        read: false,
        href: "/spaceportal/clients",
        isNew: true,
      },
    ];
    const insertedNotifications = await SpacePortalNotificationModel.insertMany(
      notifications
    );

    const notificationPreferences =
      await SpacePortalNotificationPreferenceModel.findOneAndUpdate(
        { user: adminUser._id },
        {
          $set: {
            user: adminUser._id,
            emailUpdates: true,
            bookingAlerts: true,
            smsAlerts: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

    const profile = await SpacePortalProfileModel.findOneAndUpdate(
      { user: adminUser._id },
      {
        $set: {
          user: adminUser._id,
          company: "Flashspace Ops",
          location: "San Francisco, CA",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const bookingSeeds = [
      {
        bookingNumber: "BK-SP-1001",
        user: adminUser._id,
        type: "coworking_space",
        spaceId: "Harbor Point Workspace",
        spaceSnapshot: {
          name: "Harbor Point Workspace",
          address: "Market St, SoMa",
          city: "San Francisco",
          area: "SoMa",
          image: "https://example.com/spaces/harbor-point.jpg",
        },
        plan: {
          name: "Team Space",
          price: 3200,
          originalPrice: 3600,
          discount: 11,
          tenure: 12,
          tenureUnit: "months",
        },
        status: "active",
        kycStatus: "approved",
        startDate: daysAgo(30),
        endDate: daysFromNow(335),
        features: ["24/7 Access", "Dedicated Desks", "Mail Handling"],
      },
      {
        bookingNumber: "BK-SP-1002",
        user: adminUser._id,
        type: "virtual_office",
        spaceId: "Lakeview Flex Hub",
        spaceSnapshot: {
          name: "Lakeview Flex Hub",
          address: "Wacker Dr, Loop",
          city: "Chicago",
          area: "Loop",
          image: "https://example.com/spaces/lakeview-flex.jpg",
        },
        plan: {
          name: "Virtual Office Premium",
          price: 1200,
          originalPrice: 1500,
          discount: 20,
          tenure: 6,
          tenureUnit: "months",
        },
        status: "pending_kyc",
        kycStatus: "pending",
        startDate: daysAgo(10),
        endDate: daysFromNow(170),
        features: ["Mail Handling", "Meeting Room Credits"],
      },
    ];

    await BookingModel.deleteMany({
      bookingNumber: { $in: bookingSeeds.map((seed) => seed.bookingNumber) },
    });
    const insertedBookings = await BookingModel.insertMany(bookingSeeds);

    const supportTickets = [
      {
        ticketNumber: "TCK-SP-9001",
        user: adminUser._id,
        bookingId: insertedBookings[0]?._id?.toString(),
        subject: "Access card not working",
        category: "technical",
        priority: "high",
        status: "in_progress",
        messages: [
          {
            sender: "user",
            senderName: "Space Portal Admin",
            senderId: adminUser._id,
            message: "The access card stopped working yesterday evening.",
            createdAt: daysAgo(1),
          },
          {
            sender: "support",
            senderName: "Space Portal Support",
            senderId: supportUser._id,
            message: "We are resetting your access and will update shortly.",
            createdAt: daysAgo(1),
          },
        ],
        assignedTo: supportUser._id,
      },
      {
        ticketNumber: "TCK-SP-9002",
        user: adminUser._id,
        bookingId: insertedBookings[1]?._id?.toString(),
        subject: "Invoice mismatch for last cycle",
        category: "billing",
        priority: "medium",
        status: "open",
        messages: [
          {
            sender: "user",
            senderName: "Space Portal Admin",
            senderId: adminUser._id,
            message: "The invoice total looks higher than expected.",
            createdAt: daysAgo(3),
          },
        ],
      },
    ];

    await SupportTicketModel.deleteMany({
      ticketNumber: { $in: supportTickets.map((seed) => seed.ticketNumber) },
    });
    const insertedTickets = await SupportTicketModel.insertMany(supportTickets);

    const invoices = [
      {
        invoiceNumber: "INV-SP-2001",
        user: adminUser._id,
        bookingNumber: "BK-SP-1001",
        description: "Team Space - Monthly subscription",
        lineItems: [
          {
            description: "Team Space (Monthly)",
            quantity: 1,
            rate: 3200,
            amount: 3200,
          },
        ],
        subtotal: 3200,
        taxRate: 18,
        taxAmount: 576,
        total: 3776,
        status: "paid",
        dueDate: daysAgo(7),
        paidAt: daysAgo(4),
        billingAddress: {
          name: "Jordan Lee",
          company: "Acme Robotics",
          address: "Market St, SoMa",
          city: "San Francisco",
          state: "CA",
          pincode: "94105",
        },
        pdfUrl: "https://example.com/invoices/inv-sp-2001.pdf",
      },
      {
        invoiceNumber: "INV-SP-2002",
        user: adminUser._id,
        bookingNumber: "BK-SP-1002",
        description: "Virtual Office Premium - Monthly subscription",
        lineItems: [
          {
            description: "Virtual Office Premium",
            quantity: 1,
            rate: 1200,
            amount: 1200,
          },
        ],
        subtotal: 1200,
        taxRate: 18,
        taxAmount: 216,
        total: 1416,
        status: "pending",
        dueDate: daysFromNow(10),
        billingAddress: {
          name: "Priya Shah",
          company: "Nimbus Analytics",
          address: "Wacker Dr, Loop",
          city: "Chicago",
          state: "IL",
          pincode: "60601",
        },
        pdfUrl: "https://example.com/invoices/inv-sp-2002.pdf",
      },
    ];

    await InvoiceModel.deleteMany({
      invoiceNumber: { $in: invoices.map((seed) => seed.invoiceNumber) },
    });
    const insertedInvoices = await InvoiceModel.insertMany(invoices);

    console.log("\n✅ Space portal seed completed successfully!");
    console.log("\nSummary:");
    console.log(`- Users: 2`);
    console.log(`- Spaces: ${insertedSpaces.length}`);
    console.log(`- Clients: ${insertedClients.length}`);
    console.log(`- Client KYC: ${kycSeeds.length}`);
    console.log(`- Client Agreements: ${agreementSeeds.length}`);
    console.log(`- Client Bookings: ${clientBookingsSeeds.length}`);
    console.log(`- Client Invoices: ${clientInvoiceSeeds.length}`);
    console.log(`- Booking Requests: ${insertedRequests.length}`);
    console.log(`- Calendar Bookings: ${insertedCalendarBookings.length}`);
    console.log(`- Enquiries: ${insertedEnquiries.length}`);
    console.log(`- Notifications: ${insertedNotifications.length}`);
    console.log(
      `- Notification Preferences: ${notificationPreferences ? 1 : 0}`
    );
    console.log(`- Profiles: ${profile ? 1 : 0}`);
    console.log(`- Dashboard Bookings: ${insertedBookings.length}`);
    console.log(`- Dashboard Tickets: ${insertedTickets.length}`);
    console.log(`- Dashboard Invoices: ${insertedInvoices.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding space portal data:", error);
    process.exit(1);
  }
}

seedSpacePortal();
