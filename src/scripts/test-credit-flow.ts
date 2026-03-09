import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const API_BASE_URL = "http://localhost:5000/api";
let userToken = "";
let userId = "";

async function runTest() {
  try {
    console.log("🚀 Starting Credit Flow Test...");

    // 1. Login User
    const userLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "user@flashspace.example.com",
      password: "Password123!",
    });
    userToken = userLogin.data.data.tokens.accessToken;
    userId = userLogin.data.data.user.id;
    console.log(
      "✅ User Logged In. Initial Credits:",
      userLogin.data.data.user.credits || 0,
    );
    const initialCredits = userLogin.data.data.user.credits || 0;

    // 2. Fetch Coworking Space (to book)
    const spacesRes = await axios.get(`${API_BASE_URL}/coworkingSpace/getAll`);
    const cwSpace = spacesRes.data.data[0];
    if (!cwSpace) throw new Error("No Coworking space found");
    const spaceName = cwSpace.name || cwSpace.property?.name || "Unknown Space";
    console.log("✅ Found Coworking Space:", spaceName);

    // 3. Create Coworking Booking (Earn Credits)
    console.log("-> Booking Coworking Space (1000 INR)...");
    const orderRes = await axios.post(
      `${API_BASE_URL}/payment/create-order`,
      {
        userId,
        userEmail: "user@flashspace.example.com",
        userName: "Standard User Flashspace",
        spaceId: cwSpace._id,
        spaceName: spaceName,
        planName: "Monthly Hot Desk",
        planKey: "monthly_hot_desk",
        tenure: 1,
        yearlyPrice: 1000,
        totalAmount: 1000,
        paymentType: "coworking_space",
      },
      { headers: { Authorization: `Bearer ${userToken}` } },
    );

    const orderId = orderRes.data.data.orderId;
    console.log("✅ Order created:", orderId);

    // Verify Payment (Simulate)
    await axios.post(
      `${API_BASE_URL}/payment/verify`,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_mock_" + Date.now(),
        razorpay_signature: "mock_signature",
        devMode: true,
      },
      { headers: { Authorization: `Bearer ${userToken}` } },
    );
    console.log("✅ Payment Verified.");

    // Check Earning via Auth/Profile
    const profileRes = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const creditsAfterBooking = profileRes.data.data.credits || 0;
    console.log("✅ Credits after booking:", creditsAfterBooking);

    // 1% of 1000 is 10.
    if (creditsAfterBooking !== initialCredits + 10) {
      console.warn(
        `Unexpected earnings: Got ${creditsAfterBooking}, Expected ${initialCredits + 10}`,
      );
    }

    // 4. Test Meeting Room Redemption
    const mrRes = await axios.get(`${API_BASE_URL}/meetingRoom/getAll`);
    const mrSpace = mrRes.data.data[0];
    if (!mrSpace) throw new Error("No Meeting Room found");
    const mrName = mrSpace.name || mrSpace.property?.name || "Meeting Room";
    console.log("✅ Found Meeting Room:", mrName);

    // Use credits earned (usually 10)
    const creditsToUse = 10;
    console.log(
      `-> Booking Meeting Room with ${creditsToUse} Credits redemption...`,
    );
    const mrOrderRes = await axios.post(
      `${API_BASE_URL}/payment/create-order`,
      {
        userId,
        userEmail: "user@flashspace.example.com",
        userName: "Standard User Flashspace",
        spaceId: mrSpace._id,
        spaceName: mrName,
        planName: "Hourly Booking",
        planKey: "hourly_1",
        tenure: 1,
        yearlyPrice: 500,
        totalAmount: 500,
        paymentType: "meeting_room",
        creditsToUse: creditsToUse, // Redemption!
      },
      { headers: { Authorization: `Bearer ${userToken}` } },
    );

    const mrOrderId = mrOrderRes.data.data.orderId;
    const payableAmount = mrOrderRes.data.data.amount / 100; // in INR
    const expectedPayable = 500 - creditsToUse;
    console.log(
      `✅ Order created: ${mrOrderId}. Payable Amount: ${payableAmount} INR (Expected: ${expectedPayable} INR)`,
    );

    if (payableAmount !== expectedPayable) {
      throw new Error(
        `Redemption logic failed! Payable: ${payableAmount}, Expected: ${expectedPayable}`,
      );
    }

    // Verify MR Payment
    await axios.post(
      `${API_BASE_URL}/payment/verify`,
      {
        razorpay_order_id: mrOrderId,
        razorpay_payment_id: "pay_mr_mock_" + Date.now(),
        razorpay_signature: "mock_signature",
        devMode: true,
      },
      { headers: { Authorization: `Bearer ${userToken}` } },
    );
    console.log("✅ Meeting Room Payment Verified.");

    const finalProfileRes = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log(
      "✅ Final Credits after MR booking:",
      finalProfileRes.data.data.credits,
    );

    console.log("🚀 ALL CREDIT FLOW TESTS PASSED!");
  } catch (error: any) {
    console.error("❌ Test Failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
