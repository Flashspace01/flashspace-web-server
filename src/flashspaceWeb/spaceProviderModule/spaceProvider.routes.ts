import{Router} from "express";
import{createSpaceProvider,getAllSpaceProvider,getSpaceProviderById,updateSpaceProvider,deleteSpaceProvider} from "./spaceProvider.controller";

export const spaceProviderRoutes= Router();

// /api/spaceProvider/createSpaceProvider
spaceProviderRoutes.post("/createSpaceProvider",createSpaceProvider);
// /api/spaceProvider/getAllSpaceProviders
spaceProviderRoutes.get("/getAllSpaceProviders",getAllSpaceProvider);
// /api/spaceProvider/getSpaceProviderById:spaceProviderId
spaceProviderRoutes.get("/getSpaceProviderById/:spaceProviderId",getSpaceProviderById);
// /api/spaceProvider/updateSpaceProvider
spaceProviderRoutes.put("/updateSpaceProvider/:spaceProviderId",updateSpaceProvider);
// /api/spaceProvider/deleteSpaceProvider
spaceProviderRoutes.delete("/deleteSpaceProvider/:spaceProviderId",deleteSpaceProvider);
