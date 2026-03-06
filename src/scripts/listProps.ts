import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import mongoose from "mongoose";

async function listAllProperties() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/flashspace",
    );
    const rooms = await MeetingRoomModel.find({}).select("property name");
    console.log(`Total Rooms: ${rooms.length}`);
    rooms.forEach((r: any) => {
      console.log(`Room: ${r.type}, PropertyID: ${r.property}`);
    });
    await mongoose.disconnect();
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

listAllProperties();
