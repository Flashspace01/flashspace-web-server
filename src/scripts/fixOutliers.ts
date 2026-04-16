import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function fixDelhiOutliers() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) throw new Error("DB_URI missing");

    await mongoose.connect(dbUri);
    console.log("Connected to database for diagnostic...");

    const DELHI_LAT = 28.6139;
    const DELHI_LNG = 77.2090;

    // 1. Check Properties
    const outlierProperties = await PropertyModel.find({
      city: /Delhi/i,
      "location.coordinates.1": { $lt: 20 } // Latitude < 20 is South India
    });

    console.log(`Found ${outlierProperties.length} Delhi properties with South India coordinates.`);

    for (const prop of outlierProperties) {
      console.log(`Fixing property: ${prop.name} (City: ${prop.city})`);
      await PropertyModel.findByIdAndUpdate(prop._id, {
        "location.coordinates": [DELHI_LNG, DELHI_LAT]
      });
    }

    // 2. Check Coworking Spaces
    const outlierCW = await CoworkingSpaceModel.find({
      coordinates: { $ne: null },
      "coordinates.lat": { $lt: 20 }
    }).populate('property');

    const delhiOutlierCW = outlierCW.filter((cw: any) => 
        cw.property?.city?.match(/Delhi/i) || cw.address?.match(/Delhi/i)
    );

    console.log(`Found ${delhiOutlierCW.length} Delhi Coworking Spaces with South India coordinates.`);
    for (const cw of delhiOutlierCW) {
      console.log(`Fixing Coworking: ${cw._id}`);
      await CoworkingSpaceModel.findByIdAndUpdate(cw._id, {
        coordinates: { lat: DELHI_LAT, lng: DELHI_LNG }
      });
    }

    // 3. Check Virtual Offices
    const outlierVO = await VirtualOfficeModel.find({
      coordinates: { $ne: null },
      "coordinates.lat": { $lt: 20 }
    }).populate('property');

    const delhiOutlierVO = outlierVO.filter((vo: any) => 
        vo.property?.city?.match(/Delhi/i) || vo.address?.match(/Delhi/i)
    );

    console.log(`Found ${delhiOutlierVO.length} Delhi Virtual Offices with South India coordinates.`);
    for (const vo of delhiOutlierVO) {
      console.log(`Fixing Virtual Office: ${vo._id}`);
      await VirtualOfficeModel.findByIdAndUpdate(vo._id, {
        coordinates: { lat: DELHI_LAT, lng: DELHI_LNG }
      });
    }

    console.log("Fix complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixDelhiOutliers();
