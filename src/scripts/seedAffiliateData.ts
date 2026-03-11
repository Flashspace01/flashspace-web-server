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
import { AffiliateBookingModel, BookingStatus } from "../flashspaceWeb/affiliatePortalModule/models/affiliateBooking.model";
import { AffiliateCampaignModel } from "../flashspaceWeb/affiliatePortalModule/models/affiliateCampaign.model";
import { AffiliatePayoutModel, PayoutStatus } from "../flashspaceWeb/affiliatePortalModule/models/affiliatePayout.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";
import { faker } from "@faker-js/faker/locale/en_IN";

const seedAffiliateData = async () => {
    try {
        console.log("🌱 Connecting to Database...");
        await dbConnection();

        // 1. Clear Existing Data for Affiliate Role
        console.log("🧹 Clearing existing affiliate data...");
        const affiliateUsers = await UserModel.find({ role: UserRole.AFFILIATE });
        const affiliateIds = affiliateUsers.map(u => u._id);

        await AffiliateLeadModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await QuotationModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await SupportTicketModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await AffiliateBookingModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await AffiliateCampaignModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await AffiliatePayoutModel.deleteMany({ affiliateId: { $in: affiliateIds } });
        await UserModel.deleteMany({ role: UserRole.AFFILIATE });

        console.log("✅ Cleared existing data.");

        const NUM_AFFILIATES = 5;
        const hashedPassword = await PasswordUtil.hash("Affiliate@123");

        for (let i = 0; i < NUM_AFFILIATES; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const fullName = `${firstName} ${lastName}`;
            const email = faker.internet.email({ firstName, lastName }).toLowerCase();

            console.log(`👤 Creating affiliate: ${fullName} (${email})`);

            const affiliateUser = await UserModel.create({
                fullName,
                email,
                password: hashedPassword,
                phoneNumber: faker.phone.number(),
                role: UserRole.AFFILIATE,
                authProvider: AuthProvider.LOCAL,
                isEmailVerified: true,
            });

            const affiliateId = affiliateUser._id;

            // --- SEED LEADS ---
            const numLeads = faker.number.int({ min: 5, max: 10 });
            const leads = [];
            for (let j = 0; j < numLeads; j++) {
                leads.push({
                    affiliateId,
                    name: faker.person.fullName(),
                    phone: faker.phone.number(),
                    email: faker.internet.email().toLowerCase(),
                    company: faker.company.name(),
                    interest: faker.helpers.arrayElement(Object.values(LeadInterest)),
                    status: faker.helpers.arrayElement(Object.values(LeadStatus)),
                    lastContact: faker.date.recent({ days: 30 }),
                    notes: faker.lorem.sentence(),
                });
            }
            await AffiliateLeadModel.insertMany(leads);
            console.log(`  ✅ Seeded ${numLeads} Leads.`);

            // --- SEED QUOTATIONS ---
            const numQuotes = faker.number.int({ min: 3, max: 6 });
            for (let j = 0; j < numQuotes; j++) {
                const quotationId = await QuotationModel.generateId();
                await QuotationModel.create({
                    quotationId,
                    affiliateId,
                    clientDetails: {
                        name: faker.person.fullName(),
                        email: faker.internet.email().toLowerCase(),
                        phone: faker.phone.number(),
                        companyName: faker.company.name(),
                    },
                    spaceRequirements: {
                        spaceType: faker.helpers.arrayElement(Object.values(spaceType)),
                        city: faker.location.city(),
                        location: faker.location.streetAddress(),
                        numberOfSeats: faker.number.int({ min: 1, max: 50 }),
                        duration: faker.helpers.arrayElement(["1 Month", "6 Months", "1 Year", "2 Years"]),
                        startDate: faker.date.future(),
                    },
                    price: faker.number.int({ min: 5000, max: 200000 }),
                    status: faker.helpers.arrayElement(Object.values(QuotationStatus)),
                    additionalNotes: faker.lorem.sentence(),
                });
            }
            console.log(`  ✅ Seeded ${numQuotes} Quotations.`);

            // --- SEED BOOKINGS ---
            const numBookings = faker.number.int({ min: 2, max: 4 });
            const bookings = [];
            for (let j = 0; j < numBookings; j++) {
                const startDate = faker.date.past({ years: 1 });
                const endDate = new Date(startDate);
                endDate.setFullYear(startDate.getFullYear() + 1);

                bookings.push({
                    affiliateId,
                    companyName: faker.company.name(),
                    contactPerson: faker.person.fullName(),
                    email: faker.internet.email().toLowerCase(),
                    phone: faker.phone.number(),
                    plan: faker.helpers.arrayElement(["Premium Plus", "Standard", "Enterprise"]),
                    location: faker.location.city(),
                    startDate,
                    endDate,
                    bookingAmount: faker.number.int({ min: 50000, max: 500000 }),
                    commissionAmount: faker.number.int({ min: 5000, max: 50000 }),
                    status: faker.helpers.arrayElement(Object.values(BookingStatus)),
                });
            }
            await AffiliateBookingModel.insertMany(bookings);
            console.log(`  ✅ Seeded ${numBookings} Bookings.`);

            // --- SEED CAMPAIGNS ---
            const numCampaigns = faker.number.int({ min: 1, max: 3 });
            const campaigns = [];
            for (let j = 0; j < numCampaigns; j++) {
                const name = faker.helpers.arrayElement(["Social Media Promo", "Summer Discount", "LinkedIn Outreach", "Corporate Referral"]);
                const slug = `${name.toLowerCase().replace(/ /g, "-")}-${faker.string.alphanumeric(5)}`;
                const clicks = faker.number.int({ min: 10, max: 500 });
                campaigns.push({
                    affiliateId,
                    name,
                    slug,
                    clicks,
                    conversions: faker.number.int({ min: 0, max: Math.floor(clicks * 0.1) }),
                });
            }
            await AffiliateCampaignModel.insertMany(campaigns);
            console.log(`  ✅ Seeded ${numCampaigns} Campaigns.`);

            // --- SEED PAYOUTS ---
            const numPayouts = faker.number.int({ min: 1, max: 4 });
            const payouts = [];
            for (let j = 0; j < numPayouts; j++) {
                const periodStart = faker.date.past({ years: 1 });
                const periodEnd = new Date(periodStart);
                periodEnd.setMonth(periodStart.getMonth() + 1);

                payouts.push({
                    affiliateId,
                    amount: faker.number.int({ min: 1000, max: 100000 }),
                    periodStart,
                    periodEnd,
                    status: faker.helpers.arrayElement(Object.values(PayoutStatus)),
                    transactionReference: faker.finance.transactionDescription(),
                    processedDate: faker.date.recent({ days: 10 }),
                });
            }
            await AffiliatePayoutModel.insertMany(payouts);
            console.log(`  ✅ Seeded ${numPayouts} Payouts.`);

            // --- SEED SUPPORT TICKETS ---
            const numTickets = faker.number.int({ min: 2, max: 5 });
            for (let j = 0; j < numTickets; j++) {
                const ticketId = await SupportTicketModel.generateId();
                const ticketCreatedAt = faker.date.past({ days: 30 });
                
                await SupportTicketModel.create({
                    ticketId,
                    affiliateId,
                    subject: faker.helpers.arrayElement([
                        "Commission Enquiry", 
                        "Payout Delayed", 
                        "Lead Tracking Issue", 
                        "Account Access", 
                        "New Marketing Assets Request"
                    ]),
                    status: faker.helpers.arrayElement(Object.values(TicketStatus)),
                    priority: faker.helpers.arrayElement(Object.values(TicketPriority)),
                    createdAt: ticketCreatedAt,
                    messages: [
                        {
                            role: "user",
                            text: faker.lorem.paragraph(),
                            timestamp: ticketCreatedAt
                        },
                        {
                            role: "admin",
                            text: faker.lorem.paragraph(),
                            timestamp: new Date(ticketCreatedAt.getTime() + 1000 * 60 * 60 * 4) // 4 hours later
                        }
                    ]
                });
            }
            console.log(`  ✅ Seeded ${numTickets} Support Tickets.`);
        }

        console.log("🎉 Seeding Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        process.exit(1);
    }
};

seedAffiliateData();
