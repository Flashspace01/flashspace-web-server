import { createVirtualOfficeSchema } from "./src/flashspaceWeb/virtualOfficeModule/virtualOffice.validation";
import { createCoworkingSpaceSchema } from "./src/flashspaceWeb/coworkingSpaceModule/coworkingSpace.validation";
import { createMeetingRoomSchema } from "./src/flashspaceWeb/meetingRoomModule/meetingRoom.validation";

const testValidation = () => {
  const reqVo: any = {
    body: {
      name: "Test VO",
      address: "123 Test St",
      city: "TestCity",
      area: "TestArea",
      features: ["WiFi"],
      images: ["image1.jpg"],
      gstPlanPricePerYear: 10000,
    },
  };

  const voRes = createVirtualOfficeSchema.safeParse(reqVo);
  if (!voRes.success)
    console.error("VO Error:", JSON.stringify(voRes.error.issues, null, 2));
  else console.log("VO Passed");

  const reqCs: any = {
    body: {
      name: "Test CS",
      address: "456 Test Ave",
      city: "TestCity2",
      area: "TestArea2",
      capacity: 50,
      amenities: ["Coffee"],
      images: ["image2.jpg"],
    },
  };

  const csRes = createCoworkingSpaceSchema.safeParse(reqCs);
  if (!csRes.success)
    console.error("CS Error:", JSON.stringify(csRes.error.issues, null, 2));
  else console.log("CS Passed");

  const reqMr: any = {
    body: {
      name: "Test MR",
      address: "789 Test Blvd",
      city: "TestCity3",
      area: "TestArea3",
      capacity: 10,
      type: "conference_hall",
      images: ["image3.jpg"],
      pricePerHour: 500,
    },
  };

  const mrRes = createMeetingRoomSchema.safeParse(reqMr);
  if (!mrRes.success)
    console.error("MR Error:", JSON.stringify(mrRes.error.issues, null, 2));
  else console.log("MR Passed");
};

testValidation();
