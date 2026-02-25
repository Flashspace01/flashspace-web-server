import "dotenv/config";
import { dbConnection } from "../config/db.config";
import {
    AuthProvider,
    UserModel,
    UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import {
    AffiliateLeadModel,
    LeadStatus,
    LeadInterest,
} from "../flashspaceWeb/affiliatePortalModule/models/affiliateLead.model";
import {
    QuotationModel,
    QuotationStatus,
    spaceType,
} from "../flashspaceWeb/affiliatePortalModule/models/quotation.model";
import {
    SupportTicketModel,
    TicketStatus,
    TicketPriority,
} from "../flashspaceWeb/affiliatePortalModule/models/supportTicket.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";

const seedAffiliateData = async () => {
    try {
        console.log("🌱 Connecting to Database...");
        await dbConnection();

        // 1. Find or Create Affiliate User
        const TEST_EMAIL = "affiliate@flashspace.co";
        const TEST_PASSWORD = "Affiliate@123";
        const hashedPassword = await PasswordUtil.hash(TEST_PASSWORD);
        let affiliateUser = await UserModel.findOne({ email: TEST_EMAIL });

        if (!affiliateUser) {
            console.log(`Creating new affiliate user: ${TEST_EMAIL}`);
            affiliateUser = await UserModel.create({
                fullName: "Test Affiliate",
                email: TEST_EMAIL,
                password: hashedPassword,
                phoneNumber: "9876543210",
                role: UserRole.AFFILIATE,
                authProvider: AuthProvider.LOCAL,
                isEmailVerified: true,
            });
        } else {
            // Keep test user usable for login and seed APIs (always reset known password).
            await UserModel.updateOne(
                { _id: affiliateUser._id },
                {
                    $set: {
                        fullName: "Test Affiliate",
                        phoneNumber: "9876543210",
                        role: UserRole.AFFILIATE,
                        isEmailVerified: true,
                        authProvider: AuthProvider.LOCAL,
                        password: hashedPassword,
                    },
                },
            );

            affiliateUser = await UserModel.findById(affiliateUser._id);
            if (!affiliateUser) {
                throw new Error(
                    "Failed to re-fetch affiliate user after update",
                );
            }
        }

        console.log(
            `🔹 Using Affiliate User: ${affiliateUser.fullName} (${affiliateUser._id})`,
        );
        const affiliateId = affiliateUser._id;

        // 2. Clear Existing Data for this User
        await AffiliateLeadModel.deleteMany({ affiliateId });
        await QuotationModel.deleteMany({ affiliateId });
        await SupportTicketModel.deleteMany({ affiliateId });
        console.log("🧹 Cleared existing affiliate data.");

        // =========================================================================
        // 3. SEED DATA FROM FRONTEND
        // =========================================================================

        // --- LEADS (from LeadManagementAffiliate.tsx) ---
        const leads = [
            {
                name: "Vikram Mehta",
                phone: "+91 98765 11111",
                company: "NextGen Tech",
                interest: LeadInterest.HIGH, // "Virtual Office" -> HIGH
                status: LeadStatus.HOT,
                lastContact: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                email: "vikram@nextgen.com",
                notes: "Interested in premium location in Indiranagar.",
            },
            {
                name: "Sneha Reddy",
                phone: "+91 87654 22222",
                company: "Creative Hub",
                interest: LeadInterest.MEDIUM, // "Team Space" -> MEDIUM
                status: LeadStatus.WARM,
                lastContact: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                email: "sneha@creativehub.com",
            },
            {
                name: "Arjun Kapoor",
                phone: "+91 76543 33333",
                company: "Fintech Sol",
                interest: LeadInterest.LOW, // "Meeting Room" -> LOW
                status: LeadStatus.COLD,
                lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                email: "arjun@fintech.com",
            },
            {
                name: "Pooja Singh",
                phone: "+91 65432 44444",
                company: "Design Co",
                interest: LeadInterest.VERY_LOW, // "Day Pass" -> VERY_LOW
                status: LeadStatus.WARM,
                lastContact: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                email: "pooja@designco.com",
            },
        ];

        await AffiliateLeadModel.insertMany(
            leads.map((lead) => ({ ...lead, affiliateId })),
        );
        console.log(`✅ Seeded ${leads.length} Leads from LeadManagement.`);

        // --- QUOTATIONS & BOOKINGS (from BookingManagement.tsx & QuotationGenerator.tsx) ---
        // Mapping "Bookings" to Accepted Quotations for dashboard stats

        // Helper to parse currency string to number
        const parseAmount = (amt: string) =>
            parseInt(amt.replace(/[^0-9]/g, ""), 10);

        const activeBookings = [
            {
                clientDetails: {
                    name: "Rahul Sharma",
                    companyName: "Tech Innovations Pvt Ltd",
                    email: "rahul@techinnovations.com",
                    phone: "+91 98765 43210",
                },
                spaceRequirements: {
                    spaceType: spaceType.PRIVATE_OFFICE,
                    city: "Mumbai",
                    location: "BKC",
                    numberOfSeats: 6,
                    duration: "1 Year",
                    startDate: new Date("2024-01-15"),
                },
                price: 45000,
                status: QuotationStatus.ACCEPTED,
            },
            {
                clientDetails: {
                    name: "Aditi Verma",
                    companyName: "StartupXYZ Solutions",
                    email: "aditi@startupxyz.com",
                    phone: "+91 98123 45678",
                },
                spaceRequirements: {
                    spaceType: spaceType.DEDICATED_DESK,
                    city: "Delhi",
                    location: "CP",
                    numberOfSeats: 12,
                    duration: "1 Year",
                    startDate: new Date("2023-12-01"),
                },
                price: 120000,
                status: QuotationStatus.ACCEPTED,
            },
            {
                clientDetails: {
                    name: "Vikram Singh",
                    companyName: "Global Consulting",
                    email: "vikram@globalcons.com",
                    phone: "+91 99887 76655",
                },
                spaceRequirements: {
                    spaceType: spaceType.PRIVATE_OFFICE,
                    city: "Bangalore",
                    location: "HSR",
                    numberOfSeats: 5,
                    duration: "1 Year",
                    startDate: new Date("2024-02-01"),
                },
                price: 28000,
                status: QuotationStatus.ACCEPTED,
            },
            {
                clientDetails: {
                    name: "Sneha Gupta",
                    companyName: "Alpha Wave Inc",
                    email: "sneha@alphawave.com",
                    phone: "+91 91234 56789",
                },
                spaceRequirements: {
                    spaceType: spaceType.MEETING_ROOM,
                    city: "Pune",
                    location: "Baner",
                    numberOfSeats: 8,
                    duration: "1 Year",
                    startDate: new Date("2024-03-10"),
                },
                price: 15000,
                status: QuotationStatus.ACCEPTED,
            },
        ];

        const pendingBookings = [
            {
                clientDetails: {
                    name: "Amit Roy",
                    companyName: "Design Hub Studios",
                    email: "amit@designhub.com",
                    phone: "+91 88776 65544",
                },
                spaceRequirements: {
                    spaceType: spaceType.DEDICATED_DESK,
                    city: "Chennai",
                    location: "Anna Nagar",
                    numberOfSeats: 2,
                    duration: "1 Month",
                    startDate: new Date("2024-02-05"),
                },
                price: 8000,
                status: QuotationStatus.SENT, // Treated as Sent/Pending
            },
            {
                clientDetails: {
                    name: "Priya Nair",
                    companyName: "Fintech Solutions Inc",
                    email: "priya@fintechsol.com",
                    phone: "+91 77665 54433",
                },
                spaceRequirements: {
                    spaceType: spaceType.PRIVATE_OFFICE,
                    city: "Mumbai",
                    location: "Andheri",
                    numberOfSeats: 7,
                    duration: "1 Year",
                    startDate: new Date("2024-02-10"),
                },
                price: 52000,
                status: QuotationStatus.SENT,
            },
            {
                clientDetails: {
                    name: "Rohan Das",
                    companyName: "EduTech Global",
                    email: "rohan@edutech.com",
                    phone: "+91 66554 43322",
                },
                spaceRequirements: {
                    spaceType: spaceType.DEDICATED_DESK,
                    city: "Noida",
                    location: "Sec 62",
                    numberOfSeats: 8,
                    duration: "Pending Activation",
                    startDate: new Date("2024-04-01"),
                },
                price: 80000,
                status: QuotationStatus.SENT,
            },
        ];

        const recentQuotations = [
            {
                clientDetails: {
                    name: "TechStart Solutions",
                    companyName: "TechStart Solutions",
                    email: "contact@techstart.com",
                    phone: "+91 99999 00000",
                },
                spaceRequirements: {
                    spaceType: spaceType.PRIVATE_OFFICE,
                    city: "Bangalore",
                    location: "Koramangala",
                    numberOfSeats: 10,
                    duration: "1 Month",
                    startDate: new Date(),
                },
                price: 85000,
                status: QuotationStatus.SENT,
                createdAt: new Date("2024-01-28"),
            },
            // Creative Hub Co (Mapped from View/Sent)
            {
                clientDetails: {
                    name: "Creative Hub Co",
                    companyName: "Creative Hub Co",
                    email: "contact@creativehub.com",
                    phone: "+91 88888 77777",
                },
                spaceRequirements: {
                    spaceType: spaceType.DEDICATED_DESK,
                    city: "Bangalore",
                    location: "Indiranagar",
                    numberOfSeats: 1,
                    duration: "1 Month",
                    startDate: new Date(),
                },
                price: 12000,
                status: QuotationStatus.SENT, // "Viewed" isn't a status in model usually, defaulting to SENT
                createdAt: new Date("2024-01-27"),
            },
            {
                clientDetails: {
                    name: "DataFlow Analytics",
                    companyName: "DataFlow Analytics",
                    email: "contact@dataflow.com",
                    phone: "+91 77777 66666",
                },
                spaceRequirements: {
                    spaceType: spaceType.MEETING_ROOM,
                    city: "Bangalore",
                    location: "HSR Layout",
                    numberOfSeats: 8,
                    duration: "8 Hours",
                    startDate: new Date(),
                },
                price: 4000,
                status: QuotationStatus.ACCEPTED,
                createdAt: new Date("2024-01-26"),
            },
        ];

        const allQuotations = [
            ...activeBookings,
            ...pendingBookings,
            ...recentQuotations,
        ];

        for (const quote of allQuotations) {
            const quotationId = await QuotationModel.generateId();
            await QuotationModel.create({
                ...quote,
                quotationId,
                affiliateId,
            });
        }
        console.log(
            `✅ Seeded ${allQuotations.length} Quotations (Bookings & Recent).`,
        );

        // --- SUPPORT TICKETS (from SupportTickets.tsx) ---
        const now = Date.now();
        const tickets = [
            {
                subject: "Commission calculation query",
                status: TicketStatus.OPEN,
                priority: TicketPriority.MEDIUM,
                createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
                messages: [
                    {
                        role: "user",
                        text: "I have a question about my commission calculation for the last booking.",
                        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
                    },
                ],
            },
            {
                subject: "Referral link not tracking",
                status: TicketStatus.IN_PROGRESS, // Mapped to closest enum or string if model allows
                priority: TicketPriority.HIGH,
                createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
                messages: [
                    {
                        role: "user",
                        text: "My referral link doesn't seem to be tracking clicks.",
                        timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
                    },
                    {
                        role: "admin",
                        text: "We are investigating this issue.",
                        timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000),
                    },
                ],
            },
            {
                subject: "Need marketing materials",
                status: TicketStatus.RESOLVED,
                priority: TicketPriority.LOW,
                createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
                messages: [
                    {
                        role: "user",
                        text: "Can I get some banners for social media?",
                        timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000),
                    },
                    {
                        role: "admin",
                        text: "Sent to your email.",
                        timestamp: new Date(now - 9 * 24 * 60 * 60 * 1000),
                    },
                ],
            },
            {
                subject: "Payout not reflected in dashboard",
                status: TicketStatus.OPEN,
                priority: TicketPriority.HIGH,
                createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
                messages: [
                    {
                        role: "user",
                        text: "My latest payout is not visible in the dashboard.",
                        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000),
                    },
                    {
                        role: "admin",
                        text: "We are re-syncing payout records now.",
                        timestamp: new Date(now - 20 * 60 * 60 * 1000),
                    },
                ],
            },
        ];

        for (const ticket of tickets) {
            const ticketId = await SupportTicketModel.generateId();
            await SupportTicketModel.create({
                ...ticket,
                ticketId,
                affiliateId,
            });
        }
        console.log(`✅ Seeded ${tickets.length} Support Tickets.`);

        console.log("🎉 Seeding Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        process.exit(1);
    }
};

seedAffiliateData();
