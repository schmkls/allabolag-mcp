# allabolag-mcp

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## To Use

### Cursor

Add a file called `.cursor/mcp.json` to create a local copy of this mcp or `~/.cursor/mcp.json` to add it as a global mcp.

```json
{
  "mcpServers": {
    "allabolag": {
      "command": "node",
      "args": [
        "/Users/alvinjohansson/code/personal/allabolag-mcp/dist/index.js"
      ]
    }
  }
}
```
