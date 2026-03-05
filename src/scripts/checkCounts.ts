import axios from "axios";

async function checkCounts() {
  const propertyId = "69a92c395a44a3b5420c5868";

  try {
    // 1. Get filtered count
    const filteredRes = await axios.get(
      `http://localhost:5000/api/meetingRoom/getAll?property=${propertyId}`,
    );
    const filteredCount = filteredRes.data.data.length;
    console.log(`Filtered count for property ${propertyId}: ${filteredCount}`);

    // 2. Get total count (using a dummy city that doesn't exist, or just no filter)
    const totalRes = await axios.get(
      `http://localhost:5000/api/meetingRoom/getAll`,
    );
    const totalCount = totalRes.data.data.length;
    console.log(`Total count (no filter): ${totalCount}`);

    if (filteredCount === totalCount && totalCount > 0) {
      console.log(
        "ISSUE: Filtered count matches total count! Filtering is definitely failing.",
      );
    } else {
      console.log("Filtering seems to be working on the backend.");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

checkCounts();
