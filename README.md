# Google Search Console MCP Server (@bdmarvin/mcp-server-gsc)

[![NPM version](https://img.shields.io/npm/v/@bdmarvin/mcp-server-gsc.svg)](https://www.npmjs.com/package/@bdmarvin/mcp-server-gsc)
[![Original Repository](https://img.shields.io/badge/forked%20from-ahonn/mcp--server--gsc-blue)](https://github.com/ahonn/mcp-server-gsc)

A Model Context Protocol (MCP) server providing access to Google Search Console. This version, `@bdmarvin/mcp-server-gsc`, has been significantly refactored from the original to:
- Use **OAuth 2.0 access tokens** for authentication, provided dynamically with each tool call.
- Remove the need for Google Service Account JSON keys.
- Be installable and runnable via `npx @bdmarvin/mcp-server-gsc`.
- Integrate seamlessly with an MCP OAuth Controller, such as [Bdmarvin1/typingmind-mcp](https://github.com/Bdmarvin1/typingmind-mcp).

## Features

- **Dynamic OAuth 2.0 Authentication**: Securely uses access tokens managed by an external controller.
- **Search Analytics**: Retrieve search performance data with support for various dimensions and filters.
- **Site Management**: List accessible sites.
- **Sitemap Management**: List, get, and submit sitemaps.
- **URL Inspection**: Check if a URL is indexed or can be indexed.

## Prerequisites

- **Node.js 18 or later.**
- **An MCP OAuth Controller**: This server is designed to be managed by a controller like [Bdmarvin1/typingmind-mcp](https://github.com/Bdmarvin1/typingmind-mcp) or a similar implementation. The controller handles:
    - The Google OAuth 2.0 flow with the end-user.
    - Secure storage and refreshing of Google OAuth tokens.
    - Starting this `mcp-server-gsc` process (e.g., via `npx`).
    - Injecting the necessary `__google_access_token__` into tool call arguments.
- **Google Account Permissions**: The Google account authenticated via the MCP OAuth Controller must have the necessary permissions for the Google Search Console properties you intend to access.

## Installation & Execution via `npx`

This server is intended to be run as a child process by an MCP OAuth Controller using `npx`.

To run it (typically done by the controller):
```bash
npx @bdmarvin/mcp-server-gsc
```
The server will start and listen for MCP messages on its standard input/output (stdio).

### For Developers (Fork & Manual Build)
If you're contributing or modifying this server:
```bash
git clone https://github.com/Bdmarvin1/mcp-server-gsc.git
cd mcp-server-gsc
pnpm install 
pnpm run build
# To run locally (simulating npx, for testing the build):
# node dist/index.js 
```

## Authentication Flow

1.  The end-user authenticates with Google via the **MCP OAuth Controller** (e.g., `Bdmarvin1/typingmind-mcp`).
2.  The MCP OAuth Controller obtains a Google Access Token for the user.
3.  When a tool on this `mcp-server-gsc` is called:
    *   The MCP OAuth Controller starts `npx @bdmarvin/mcp-server-gsc` (if not already running for the session).
    *   The controller injects the `__google_access_token__` (and optionally `__google_user_id__`, `__google_user_email__`) into the `arguments` object of the `CallToolRequest`.
    *   This request is sent to `mcp-server-gsc`'s stdin.
4.  `mcp-server-gsc` uses the provided access token to make the Google Search Console API call.

**This server does NOT handle OAuth callbacks, manage refresh tokens, or require `GOOGLE_APPLICATION_CREDENTIALS`.**

## Configuration within an MCP OAuth Controller

Here's an example of how to configure an MCP OAuth Controller (like `Bdmarvin1/typingmind-mcp` or a standard TypingMind MCP instance) to use this server:

```json
{
  "mcpServers": {
    "gsc-bdmarvin": { // A unique name for this server instance
      "command": "npx",
      "args": ["@bdmarvin/mcp-server-gsc"],
      "env": {
        // No environment variables needed for authentication
      },
      "captureStderr": true // Recommended for debugging
    }
  }
}
```

## Available Tools

All tools expect the `__google_access_token__` to be present in the `arguments` object of the `CallToolRequest`, injected by the MCP OAuth Controller.

### `list_sites`
- **Description**: Lists all sites the authenticated Google Account has access to in Google Search Console.
- **Input `arguments`**: `{ "__google_access_token__": "user_access_token_here" }`

### `search_analytics`
- **Description**: Get search performance data from Google Search Console.
- **Input `arguments`**:
    - `__google_access_token__` (string, **required**)
    - `siteUrl` (string, **required**): URL of the GSC property (e.g., `https://example.com/` or `sc-domain:example.com`).
    - `startDate` (string, **required**): YYYY-MM-DD format.
    - `endDate` (string, **required**): YYYY-MM-DD format.
    - `dimensions` (array of strings, optional): e.g., `["query", "page", "country", "device", "searchAppearance"]`.
    - `type` (string, optional): Search type, e.g., `"web"`, `"image"`, `"video"`, `"news"`.
    - `aggregationType` (string, optional): e.g., `"auto"`, `"byNewsShowcasePanel"`, `"byProperty"`, `"byPage"`.
    - `rowLimit` (number, optional): Max rows (default: 1000).

_Example `arguments` for `search_analytics`:_
```json
{
  "__google_access_token__": "ya29.a0AfH6SMB...",
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": ["query", "country"]
}
```

### `index_inspect`
- **Description**: Inspect a URL to see if it is indexed or can be indexed.
- **Input `arguments`**:
    - `__google_access_token__` (string, **required**)
    - `siteUrl` (string, **required**): The URL of the Search Console property.
    - `inspectionUrl` (string, **required**): The exact URL of the page to inspect.
    - `languageCode` (string, optional): e.g., `"en-US"`.

### `list_sitemaps`
- **Description**: List sitemaps for a site.
- **Input `arguments`**:
    - `__google_access_token__` (string, **required**)
    - `siteUrl` (string, **required**): The site's URL.
    - `sitemapIndex` (string, optional): URL of a sitemap index.

### `get_sitemap`
- **Description**: Get a sitemap's details.
- **Input `arguments`**:
    - `__google_access_token__` (string, **required**)
    - `siteUrl` (string, **required**): The site's URL.
    - `feedpath` (string, **required**): The full URL of the sitemap.

### `submit_sitemap`
- **Description**: Submit a sitemap.
- **Input `arguments`**:
    - `__google_access_token__` (string, **required**)
    - `siteUrl` (string, **required**): The site's URL.
    - `feedpath` (string, **required**): The full URL of the sitemap to submit.

## License

MIT

## Contributing

Contributions to `Bdmarvin1/mcp-server-gsc` are welcome! Please open an issue or pull request.
