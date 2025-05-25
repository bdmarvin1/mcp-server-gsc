#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// @ts-ignore
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GetSitemapSchema,
  IndexInspectSchema,
  ListSitemapsSchema,
  SearchAnalyticsSchema,
  SubmitSitemapSchema,
} from './schemas.js';
import { z } from 'zod';
import { SearchConsoleService } from './search-console.js';

const server = new Server(
  {
    name: 'gsc-mcp-server',
    version: '0.1.0', // Consider bumping version after these changes
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  },
);

// REMOVED: GOOGLE_APPLICATION_CREDENTIALS check
// const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
// if (!GOOGLE_APPLICATION_CREDENTIALS) {
//   console.error('GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
//   process.exit(1);
// }

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_sites',
        description: 'List all sites in Google Search Console',
        inputSchema: zodToJsonSchema(z.object({})), // No specific input beyond potential context
      },
      {
        name: 'search_analytics',
        description: 'Get search performance data from Google Search Console',
        inputSchema: zodToJsonSchema(SearchAnalyticsSchema),
      },
      {
        name: 'index_inspect',
        description: 'Inspect a URL to see if it is indexed or can be indexed',
        inputSchema: zodToJsonSchema(IndexInspectSchema),
      },
      {
        name: 'list_sitemaps',
        description: 'List sitemaps for a site in Google Search Console',
        inputSchema: zodToJsonSchema(ListSitemapsSchema),
      },
      {
        name: 'get_sitemap',
        description: 'Get a sitemap for a site in Google Search Console',
        inputSchema: zodToJsonSchema(GetSitemapSchema),
      },
      {
        name: 'submit_sitemap',
        description: 'Submit a sitemap for a site in Google Search Console',
        inputSchema: zodToJsonSchema(SubmitSitemapSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const augmentedArgs = request.params.arguments as any; // Cast for now, consider defining a type

    if (!augmentedArgs) { // Check if augmentedArgs itself is missing
      throw new Error('Arguments are required');
    }

    const googleAccessToken = augmentedArgs.__google_access_token__;
    // Optional: const googleUserId = augmentedArgs.__google_user_id__;
    // Optional: const googleUserEmail = augmentedArgs.__google_user_email__;

    if (typeof googleAccessToken !== 'string' || !googleAccessToken) {
      throw new Error(
        '__google_access_token__ not provided or invalid in arguments by the MCP OAuth Controller.',
      );
    }

    // Instantiate SearchConsoleService without credentials path
    const searchConsole = new SearchConsoleService();

    switch (request.params.name) {
      case 'search_analytics': {
        const args = SearchAnalyticsSchema.parse(augmentedArgs);
        const siteUrl = args.siteUrl;
        const requestBody = {
          startDate: args.startDate,
          endDate: args.endDate,
          dimensions: args.dimensions,
          searchType: args.type,
          aggregationType: args.aggregationType,
          rowLimit: args.rowLimit,
        };
        // Pass googleAccessToken as the first argument
        const response = await searchConsole.searchAnalytics(googleAccessToken, siteUrl, requestBody);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'list_sites': {
        // No arguments to parse beyond the access token
        const response = await searchConsole.listSites(googleAccessToken);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'index_inspect': {
        const args = IndexInspectSchema.parse(augmentedArgs);
        const requestBody = {
          siteUrl: args.siteUrl,
          inspectionUrl: args.inspectionUrl,
          languageCode: args.languageCode,
        };
        const response = await searchConsole.indexInspect(googleAccessToken, requestBody);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'list_sitemaps': {
        const args = ListSitemapsSchema.parse(augmentedArgs);
        const requestBody = { // This is actually Params$Resource$Sitemaps$List
          siteUrl: args.siteUrl,
          sitemapIndex: args.sitemapIndex, // This might be undefined if not provided
        };
        const response = await searchConsole.listSitemaps(googleAccessToken, requestBody);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_sitemap': {
        const args = GetSitemapSchema.parse(augmentedArgs);
        const requestBody = { // This is Params$Resource$Sitemaps$Get
          siteUrl: args.siteUrl,
          feedpath: args.feedpath,
        };
        const response = await searchConsole.getSitemap(googleAccessToken, requestBody);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'submit_sitemap': {
        const args = SubmitSitemapSchema.parse(augmentedArgs);
        const requestBody = { // This is Params$Resource$Sitemaps$Submit
          siteUrl: args.siteUrl,
          feedpath: args.feedpath,
        };
        const response = await searchConsole.submitSitemap(googleAccessToken, requestBody);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error('Error in CallToolRequest handler:', error); // Enhanced logging
    if (error instanceof z.ZodError) {
      // Provide more context for Zod errors
      const messages = error.errors.map((e) => `${e.path.join('.') || 'argument'}: ${e.message}`);
      throw new Error(`Invalid arguments: ${messages.join('; ')}`);
    }
    // Re-throw other errors, ensuring they are actual Error instances
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unexpected error occurred: ${String(error)}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP Server (OAuth2 Ready) running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
