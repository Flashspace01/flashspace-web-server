import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "Test@123";

async function run() {
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const token = loginRes.data.data.tokens.accessToken;

    const res = await axios.get(`${BASE_URL}/spaceportal/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}

run();
