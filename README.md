# allabolag-mcp

General MCP reading: https://modelcontextprotocol.io/introduction

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Get Started

To install dependencies:

```bash
bun install
```

To run with inspector:

```bash
bun inspector
```

Then go to `http://localhost:5173`

## To Use

### Cursor

Add a file called `.cursor/mcp.json` to create a local copy of this mcp or `~/.cursor/mcp.json` to add it as a global mcp.

```json
{
  "mcpServers": {
    "allabolag": {
      "command": "node",
      "args": ["/Users/wihu/full/path/to/allabolag-mcp/dist/index.js"]
    }
  }
}
```
