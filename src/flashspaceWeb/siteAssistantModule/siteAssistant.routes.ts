import { Router, Request, Response } from "express";
import { processQuery, processMultiQuery } from "./siteAssistant.engine";

export const siteAssistantRoutes = Router();

/**
 * POST /api/site-assistant/query
 * 
 * Process a natural language query and return structured navigation data.
 * 
 * Body: { "query": "I want a virtual office in Delhi" }
 * 
 * Returns: {
 *   success: true,
 *   data: {
 *     intent: "search_workspace",
 *     route: "/services/virtual-office",
 *     filters: { city: "delhi", type: "virtual_office" },
 *     confidence: 85,
 *     message: "🔍 Searching virtual office in Delhi",
 *     suggestions: [...]
 *   }
 * }
 */
siteAssistantRoutes.post("/query", (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'query' field. Must be a non-empty string.",
      });
      return;
    }

    if (query.length > 500) {
      res.status(400).json({
        success: false,
        message: "Query too long. Maximum 500 characters.",
      });
      return;
    }

    const result = processQuery(query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[SiteAssistant] Error processing query:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error processing your request.",
    });
  }
});

/**
 * POST /api/site-assistant/multi-query
 * 
 * Process a complex query that may contain multiple intents
 * (e.g., "Find me a cheap coworking space in Gurgaon and compare top options")
 * 
 * Body: { "query": "..." }
 * 
 * Returns: {
 *   success: true,
 *   data: [ { intent: ..., route: ..., filters: ... }, ... ]
 * }
 */
siteAssistantRoutes.post("/multi-query", (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Missing or invalid 'query' field. Must be a non-empty string.",
      });
      return;
    }

    if (query.length > 500) {
      res.status(400).json({
        success: false,
        message: "Query too long. Maximum 500 characters.",
      });
      return;
    }

    const results = processMultiQuery(query);

    res.json({
      success: true,
      data: results,
      // primary = first result (for simple redirect)
      primary: results[0],
    });
  } catch (error) {
    console.error("[SiteAssistant] Error processing multi-query:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error processing your request.",
    });
  }
});

/**
 * GET /api/site-assistant/health
 */
siteAssistantRoutes.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Site Assistant is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});
