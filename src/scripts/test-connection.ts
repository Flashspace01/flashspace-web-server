import axios from "axios";

async function run() {
  try {
    const res = await axios.get("http://localhost:5000/api/health");
    console.log("✅ API Health:", res.data);
  } catch (err: any) {
    console.error("❌ API Error:", err.message);
  }
}
run();
