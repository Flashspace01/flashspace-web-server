import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import mongoose from "mongoose";

async function inspectData() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("Connected to DB");

    const rooms = await MeetingRoomModel.find({})
      .limit(5)
      .select("name property");
    console.log("Sample Rooms:");
    rooms.forEach((r: any) => {
      console.log(
        `Room: ${r.type}, Property: ${r.property} (Type: ${typeof r.property})`,
      );
    });

    const totalCount = await MeetingRoomModel.countDocuments({});
    console.log(`Total Rooms in DB: ${totalCount}`);

    const propertyId = "69a92c395a44a3b5420c5868";
    const filteredCount = await MeetingRoomModel.countDocuments({
      property: new mongoose.Types.ObjectId(propertyId),
    });
    console.log(
      `Rooms for property ${propertyId} (using ObjectId): ${filteredCount}`,
    );

    const filteredCountStr = await MeetingRoomModel.countDocuments({
      property: propertyId,
    });
    console.log(
      `Rooms for property ${propertyId} (using string): ${filteredCountStr}`,
    );

    await mongoose.disconnect();
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

inspectData();
