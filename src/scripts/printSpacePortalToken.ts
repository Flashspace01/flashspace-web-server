import dotenv from "dotenv";
import mongoose from "mongoose";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";

dotenv.config();

const args = process.argv.slice(2);

const getArgValue = (flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
};

const email =
  getArgValue("--email") ||
  process.env.TOKEN_EMAIL ||
  args[0] ||
  "spaceportal.admin@flashspace.ai";

const password = getArgValue("--password") || process.env.TOKEN_PASSWORD || args[1];

const shouldPrintRefresh = process.env.PRINT_REFRESH_TOKEN === "true";

const run = async () => {
  if (!process.env.DB_URI) {
    throw new Error("DB_URI is not defined in environment variables");
  }

  await mongoose.connect(process.env.DB_URI as string);

  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  if (password) {
    if (!user.password) {
      throw new Error("User has no password set (non-local auth).");
    }
    const isValid = await PasswordUtil.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid password.");
    }
  } else {
    console.warn(
      "Warning: password not provided, token will be generated without credential check."
    );
  }

  // Load JwtUtil after dotenv to ensure secrets are available.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JwtUtil } = require("../flashspaceWeb/authModule/utils/jwt.util");

  const tokens = JwtUtil.generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  console.log(tokens.accessToken);

  if (shouldPrintRefresh) {
    console.log(`REFRESH_TOKEN=${tokens.refreshToken}`);
  }
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
