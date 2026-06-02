import { Router } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./McpServer";

const router = Router();

// Store active transports
const transports = new Map<string, SSEServerTransport>();

// Middleware to secure the MCP endpoints (Basic API Key Auth)
const mcpAuth = (req: any, res: any, next: any) => {
  const apiKey = req.headers["x-mcp-api-key"];
  const expectedKey = process.env.MCP_API_KEY;
  
  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized. Invalid MCP API Key." });
  }
  next();
};

// GET /api/mcp/sse - Establish the SSE connection
router.get("/sse", mcpAuth, async (req, res) => {
  console.log("[MCP] New SSE connection request received");
  const transport = new SSEServerTransport("/api/mcp/messages", res as any);
  transports.set(transport.sessionId, transport);
  
  res.on('close', () => {
    transports.delete(transport.sessionId);
  });

  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
});

// POST /api/mcp/messages - Receive messages from the client
import express from "express";
router.post("/messages", mcpAuth, express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "No active SSE transport connection" });
  }
  try {
    await transport.handlePostMessage(req as any, res as any, req.body);
  } catch (err) {
    console.error("MCP handlePostMessage Error:", err);
  }
});

export const mcpRoutes = router;
