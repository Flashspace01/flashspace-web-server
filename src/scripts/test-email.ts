import dotenv from "dotenv";
import path from "path";
import { EmailUtil } from "../flashspaceWeb/authModule/utils/email.util";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const mask = (value?: string) => {
  if (!value) return "<missing>";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const run = async () => {
  const recipient =
    process.argv[2] ||
    process.env.TEST_EMAIL_TO ||
    process.env.EMAIL_USER ||
    process.env.EMAIL_FROM;

  if (!recipient) {
    throw new Error(
      "Pass a recipient email: npm run test:email -- you@example.com",
    );
  }

  console.log("Testing FlashSpace email delivery");
  console.log("Service:", process.env.EMAIL_SERVICE || (process.env.SMTP_HOST ? "smtp" : "disabled"));
  console.log("SMTP host:", process.env.SMTP_HOST || "<not set>");
  console.log("From:", process.env.EMAIL_FROM || process.env.EMAIL_USER || "<not set>");
  console.log("SendGrid key:", mask(process.env.SENDGRID_API_KEY));
  console.log("Recipient:", recipient);

  EmailUtil.initialize();

  const isConfigured = await EmailUtil.testConnection();
  if (!isConfigured) {
    throw new Error("Email provider is not configured correctly.");
  }

  await EmailUtil.sendPasswordResetEmail(
    recipient,
    "test-token-check-your-real-reset-email-flow",
    "FlashSpace Test User",
  );

  console.log("Test email sent. Check inbox and spam/promotions folders.");
};

run().catch((error) => {
  console.error("Email test failed:", error?.message || error);
  process.exit(1);
});
