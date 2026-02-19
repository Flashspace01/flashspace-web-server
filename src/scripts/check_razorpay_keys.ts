import dotenv from "dotenv";
import path from "path";

// Load .env from project root
const envPath = path.resolve(__dirname, "../../.env");
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("Error loading .env file:", result.error);
}

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log("--- Razorpay Key Check ---");
if (!keyId) {
  console.log("RAZORPAY_KEY_ID is MISSING or EMPTY.");
} else {
  console.log(`RAZORPAY_KEY_ID present. Length: ${keyId.length}`);
  console.log(`Prefix: ${keyId.substring(0, 9)}...`);
}

if (!keySecret) {
  console.log("RAZORPAY_KEY_SECRET is MISSING or EMPTY.");
} else {
  console.log(`RAZORPAY_KEY_SECRET present. Length: ${keySecret.length}`);
  console.log(`Prefix: ${keySecret.substring(0, 4)}...`);
}
