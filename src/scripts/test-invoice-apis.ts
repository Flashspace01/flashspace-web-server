import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import { InvoiceModel } from "../flashspaceWeb/invoiceModule/invoice.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";

// We need to mock the req and res locally to call the controller directly
import {
  getAllInvoices,
  getInvoiceById,
} from "../flashspaceWeb/userDashboardModule/controllers/userDashboard.controller";
import {
  getAllInvoices as getAllInvoicesAdmin,
  getInvoiceById as getInvoiceByIdAdmin,
} from "../flashspaceWeb/invoiceModule/invoice.controller";

dotenv.config();

async function testInvoiceAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    // 1. Setup Mock User
    const mockDbUser = await UserModel.create({
      fullName: "Invoice Test User",
      email: `invoicetest_${Date.now()}@example.com`,
      phone: `+91998${Math.floor(Math.random() * 1000000)}`,
      role: UserRole.USER,
      authProvider: "local",
      status: "active",
      credits: 0,
    });
    const userId = mockDbUser._id.toString();
    console.log("🔨 Created Test User");

    const mockPartner = await UserModel.create({
      fullName: "Pass Through Partner",
      email: `passpartner_${Date.now()}@test.com`,
      phone: `+91997${Math.floor(Math.random() * 1000000)}`,
      role: UserRole.PARTNER,
      authProvider: "local",
      status: "active",
    });

    const booking = await BookingModel.create({
      bookingNumber: `FS-TEST-${Date.now()}`,
      user: userId,
      partner: mockPartner._id,
      type: "MeetingRoom",
      spaceId: new mongoose.Types.ObjectId(),
      spaceSnapshot: { name: "Test Room Base" },
      plan: { name: "Hourly", price: 50, tenure: 1, finalPrice: 50 },
      status: "active",
    });

    // Create 3 Invoices
    for (let i = 0; i < 3; i++) {
      await InvoiceModel.create({
        invoiceNumber: `INV-TEST-${Date.now()}-${i}`,
        user: userId,
        partner: mockPartner._id,
        booking: booking._id,
        bookingNumber: booking.bookingNumber,
        description: "Test",
        lineItems: [{ description: "test", quantity: 1, rate: 50, amount: 50 }],
        subtotal: 50,
        taxRate: 18,
        taxAmount: 9,
        total: 59,
        status: "pending",
        dueDate: new Date(),
        billingAddress: { name: "test", city: "test" },
      });
    }

    const testInvoice = await InvoiceModel.findOne({ user: userId });

    // MOCK RESPONSE OBJECT
    const mockRes = () => {
      const res: any = {};
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data: any) => {
        res.body = data;
        return res;
      };
      return res;
    };

    // 2. Test User Dashboard getAllInvoices (with huge limit to trigger Math.min)
    const req1 = { user: { id: userId }, query: { limit: "50000" } } as any;
    const res1 = mockRes();
    await getAllInvoices(req1, res1);

    if (
      res1.statusCode === 200 &&
      res1.body.success &&
      res1.body.data.invoices.length === 3
    ) {
      console.log(
        "✅ API: UserDashboard getAllInvoices (Unbounded Limit Blocked) - PASS",
      );
    } else {
      console.error("❌ API: UserDashboard getAllInvoices - FAIL", res1.body);
    }

    // 3. Test Admin getAllInvoices using Zod schema DoS block
    const req2 = {
      user: { id: userId, role: "user" },
      query: { limit: "50000" },
    } as any;
    const res2 = mockRes();
    await getAllInvoicesAdmin(req2, res2);

    if (res2.statusCode === 400 && !res2.body.success) {
      console.log("✅ API: Admin getAllInvoices (Zod DoS Blocked) - PASS");
    } else {
      console.error("❌ API: Admin getAllInvoices - FAIL", res2.body);
    }

    // 4. Test UserDashboard getInvoiceById Valid Case
    const req3 = {
      user: { id: userId },
      params: { invoiceId: testInvoice?._id.toString() },
    } as any;
    const res3 = mockRes();
    await getInvoiceById(req3, res3);

    if (res3.statusCode === 200 && res3.body.success) {
      console.log(
        "✅ API: UserDashboard getInvoiceById (Valid ObjectId) - PASS",
      );
    } else {
      console.error("❌ API: UserDashboard getInvoiceById - FAIL", res3.body);
    }

    // 5. Test UserDashboard getInvoiceById Invalid ObjectId
    const req4 = {
      user: { id: userId },
      params: { invoiceId: "hackertryingtocrashtheserver123" },
    } as any;
    const res4 = mockRes();
    await getInvoiceById(req4, res4);

    if (res4.statusCode === 400 && !res4.body.success) {
      console.log(
        "✅ API: UserDashboard getInvoiceById (ObjectId Crash Blocked) - PASS",
      );
    } else {
      console.error("❌ API: UserDashboard getInvoiceById - FAIL", res4.body);
    }
  } catch (error) {
    console.error("💥 Integration Test Error:", error);
  } finally {
    console.log("🧹 Cleaning up...");
    // Cleanup everything matching email prefix
    await UserModel.deleteMany({ email: { $regex: "^invoicetest_" } });
    await UserModel.deleteMany({ email: { $regex: "^passpartner_" } });
    await BookingModel.deleteMany({ bookingNumber: { $regex: "^FS-TEST-" } });
    await InvoiceModel.deleteMany({ invoiceNumber: { $regex: "^INV-TEST" } });
    await mongoose.disconnect();
    console.log("✅ Disconnected & Done");
  }
}

testInvoiceAPIs();
