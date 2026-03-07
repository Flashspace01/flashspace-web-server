import axios from "axios";

async function test() {
  try {
    const url =
      "http://localhost:5000/api/meetingRoom/getAll?property=69a92c395a44a3b5420c5868";
    console.log(`Testing URL: ${url}`);
    const response = await axios.get(url);

    console.log("STATUS:", response.status);
    console.log("MESSAGE:", response.data.message);
    if (response.data.data && response.data.data.coworkingSpaces) {
      console.log(
        "ISSUE DETECTED: Response contains coworkingSpaces! This is the PropertyController response.",
      );
    } else {
      console.log("SUCCESS: Response structure matches MeetingRoomController.");
    }
    console.log(
      "DATA LENGTH:",
      Array.isArray(response.data.data)
        ? response.data.data.length
        : "Not an array",
    );
    console.log(
      "FULL DATA SAMPLE:",
      JSON.stringify(response.data.data).substring(0, 500),
    );
    console.log(
      "DATA STRUCTURE:",
      JSON.stringify(response.data.data, null, 2).substring(0, 500),
    );
  } catch (err: any) {
    console.error("ERROR:", err.response?.data || err.message);
  }
}

test();
