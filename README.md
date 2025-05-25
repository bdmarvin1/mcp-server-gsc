# Google Search Console MCP Server
[![smithery badge](https://smithery.ai/badge/mcp-server-gsc)](https://smithery.ai/server/mcp-server-gsc)

A Model Context Protocol (MCP) server providing access to Google Search Console. This version has been modified to use OAuth 2.0 access tokens for authentication.

## Features

- Search analytics data retrieval with dimensions support
- Rich data analysis with customizable reporting periods
- Site and sitemap management capabilities
- URL inspection

## Prerequisites

- Node.js 18 or later
- Access to a Google Account that has permissions for the desired Google Search Console properties.
- An "MCP OAuth Controller" server (like `typingmind-mcp` or a similar custom implementation) that handles the Google OAuth 2.0 flow and injects access tokens.

## Installation

### Installing via Smithery

(Note: Smithery installation might need to be updated to reflect the new authentication mechanism if it relied on service account environment variables.)

To install Google Search Console for Claude Desktop automatically via [Smithery](https://smithery.ai/server/mcp-server-gsc):

```bash
npx -y @smithery/cli install mcp-server-gsc --client claude
```

### Manual Installation
```bash
npm install mcp-server-gsc 
# or if you are working with the forked repository:
# git clone https://github.com/Bdmarvin1/mcp-server-gsc.git
# cd mcp-server-gsc
# pnpm install # (or npm install / yarn install based on your setup)
# pnpm run build 
```

## Authentication Setup (OAuth 2.0 via MCP OAuth Controller)

This server no longer uses Google Service Account keys directly. Instead, it relies on an external MCP OAuth Controller to perform the Google OAuth 2.0 authentication flow and provide a Google Access Token with each tool call.

The MCP OAuth Controller is responsible for:
1.  Handling the Google OAuth 2.0 flow with the end-user.
2.  Securely storing Google refresh tokens.
3.  Injecting a fresh Google Access Token (`__google_access_token__`) and optionally Google User ID (`__google_user_id__`) and email (`__google_user_email__`) into the `arguments` object passed to this server's tools.

**This GSC MCP Server expects the `__google_access_token__` to be present in the `arguments` of each tool request.**

## Usage

This server is intended to be called by an MCP OAuth Controller. The controller will manage starting this server and invoking its tools.

### Example: How the MCP OAuth Controller interacts (Conceptual)

When a client (e.g., TypingMind UI) needs to use a tool from this GSC server:
1. Client makes a request to the MCP OAuth Controller's `/clients/:id/call_tools` endpoint.
2. The MCP OAuth Controller:
    a. Authenticates the client and the user context.
    b. Retrieves/refreshes the Google Access Token for the user.
    c. Constructs the arguments for the GSC tool, injecting `__google_access_token__`.
    d. Calls the appropriate tool on this `mcp-server-gsc` instance (e.g., via StdioClientTransport), passing the augmented arguments.

**No `GOOGLE_APPLICATION_CREDENTIALS` environment variable is needed or used by this server anymore.**

## Available Tools

(Tool parameters remain the same, but authentication is handled via the injected access token.)

### `list_sites`
List all sites the authenticated Google Account has access to in Google Search Console.
- Input: (No specific parameters beyond the injected `__google_access_token__`)

### `search_analytics`
Get search performance data from Google Search Console.
- **Required Parameters (in `arguments` object):**
    - `siteUrl`: Site URL (format: `http://www.example.com/` or `sc-domain:example.com`)
    - `startDate`: Start date (YYYY-MM-DD)
    - `endDate`: End date (YYYY-MM-DD)
- **Optional Parameters (in `arguments` object):**
    - `dimensions`: Comma-separated list (`query,page,country,device,searchAppearance`)
    - `type`: Search type (`web`, `image`, `video`, `news`)
    - `aggregationType`: Aggregation method (`auto`, `byNewsShowcasePanel`, `byProperty`, `byPage`)
    - `rowLimit`: Maximum rows to return (default: 1000)

Example `arguments` for `search_analytics` (as prepared by the MCP OAuth Controller):
```json
{
  "__google_access_token__": "ya29.a0AfH6SMB...", 
  "__google_user_id__": "109...",
  "__google_user_email__": "user@example.com",
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "query,country",
  "type": "web",
  "rowLimit": 500
}
```

### `index_inspect`
Inspect a URL to see if it is indexed or can be indexed.
- **Required Parameters (in `arguments` object):**
    - `siteUrl`: The URL of the Search Console property that includes the page to inspect.
    - `inspectionUrl`: The exact URL of the page to inspect (must be within `siteUrl`).
- **Optional Parameters (in `arguments` object):**
    - `languageCode`: Language code for the inspection (e.g., "en-US").

### `list_sitemaps`
List sitemaps for a site in Google Search Console.
- **Required Parameters (in `arguments` object):**
    - `siteUrl`: The site's URL.
- **Optional Parameters (in `arguments` object):**
    - `sitemapIndex`: URL of a sitemap index. If specified, lists sitemaps in the index.

### `get_sitemap`
Get a sitemap for a site in Google Search Console.
- **Required Parameters (in `arguments` object):**
    - `siteUrl`: The site's URL.
    - `feedpath`: The URL of the sitemap (e.g., `https://www.example.com/sitemap.xml`).

### `submit_sitemap`
Submit a sitemap for a site in Google Search Console.
- **Required Parameters (in `arguments` object):**
    - `siteUrl`: The site's URL.
    - `feedpath`: The URL of the sitemap to submit.

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.
