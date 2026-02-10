import { Router } from "express";

import {

  createFeedback,

  getAllFeedback,

  getNpsStats,

  getAiInsight,

} from "./feedback.controller";



export const feedbackRoutes = Router();



/**

 * POST /api/feedback/create

 */

feedbackRoutes.post("/create", createFeedback);



/**

 * GET /api/feedback

 */

feedbackRoutes.get("/", getAllFeedback);



/**

 * GET /api/feedback/getAll (legacy)

 */

feedbackRoutes.get("/getAll", getAllFeedback);



/**

 * GET /api/feedback/nps

 */

feedbackRoutes.get("/nps", getNpsStats);



/**

 * GET /api/feedback/ai-insight

 * AI-based suggestion for space partners

 */

feedbackRoutes.get("/ai-insight", getAiInsight);