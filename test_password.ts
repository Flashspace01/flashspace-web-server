import { PasswordUtil } from "./src/flashspaceWeb/authModule/utils/password.util";

async function run() {
  const password = "Admin@123";
  const hash =
    "$2a$12$K1r0d2X0jzUWmgrN76lkOUS2HIZgQFtp.B/GRmBU9PdbquS.sg6Un0hH6oTxp";

  // Since my terminal cut off the hash, I am going to properly check the password validation
  console.log("Checking password...");
  try {
    const isValid = await PasswordUtil.compare(password, hash);
    console.log("Is valid:", isValid);
  } catch (e) {
    console.error("Error comparing:", e);
  }
}
run();
