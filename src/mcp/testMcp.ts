import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const url = new URL("http://localhost:5001/api/mcp/sse");
  const transport = new SSEClientTransport(url, {
    requestInit: {
      headers: {
        "x-mcp-api-key": "emily-flashspace-admin-key",
        "x-flashspace-csrf": "true"
      }
    }
  });

  const client = new Client({
    name: "Emily-Admin-Bot",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  console.log("Connecting to MCP Server at", url.toString());
  
  try {
    await client.connect(transport);
    console.log("✅ Successfully connected to MCP Server!");
    
    console.log("\nFetching tools...");
    const tools = await client.listTools();
    console.log("Available tools:");
    tools.tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));
    
    console.log("\nDone!");
  } catch (err: any) {
    console.error("❌ Failed to connect:", err.message);
  } finally {
    process.exit(0);
  }
}

main();
