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
    version: '0.2.2', // Updated version
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_sites',
        description: 'List all sites in Google Search Console',
        inputSchema: zodToJsonSchema(z.object({})),
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
    const allArgsFromController = request.params.arguments as any; 

    if (!allArgsFromController) {
      throw new Error('Arguments object is required from the controller');
    }

    const googleAccessToken = allArgsFromController.__google_access_token__;
    const googleUserId = allArgsFromController.__google_user_id__;
    const googleUserEmail = allArgsFromController.__google_user_email__;

    if (typeof googleAccessToken !== 'string' || !googleAccessToken) {
      throw new Error(
        '__google_access_token__ not provided or invalid in arguments by the MCP OAuth Controller.',
      );
    }
    
    const originalToolArgs: {[key: string]: any} = {};
    for (const key in allArgsFromController) {
      if (key !== '__google_access_token__' && key !== '__google_user_id__' && key !== '__google_user_email__') {
        originalToolArgs[key] = allArgsFromController[key];
      }
    }
    
    console.error(`GSC Server: Received call for tool: ${request.params.name}`);
    console.error(`GSC Server: Google User Context: ID=${googleUserId}, Email=${googleUserEmail}`);

    const searchConsole = new SearchConsoleService();

    switch (request.params.name) {
      case 'search_analytics': {
        const parsedArgs = SearchAnalyticsSchema.parse(originalToolArgs);
        const siteUrl = parsedArgs.siteUrl;
        const requestBody = {
          startDate: parsedArgs.startDate,
          endDate: parsedArgs.endDate,
          dimensions: parsedArgs.dimensions,
          searchType: parsedArgs.type,
          aggregationType: parsedArgs.aggregationType,
          rowLimit: parsedArgs.rowLimit,
        };
        const response = await searchConsole.searchAnalytics(googleAccessToken, siteUrl, requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'list_sites': {
        const response = await searchConsole.listSites(googleAccessToken);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'index_inspect': {
        const parsedArgs = IndexInspectSchema.parse(originalToolArgs);
        const requestBody = {
          siteUrl: parsedArgs.siteUrl,
          inspectionUrl: parsedArgs.inspectionUrl,
          languageCode: parsedArgs.languageCode,
        };
        const response = await searchConsole.indexInspect(googleAccessToken, requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'list_sitemaps': {
        const parsedArgs = ListSitemapsSchema.parse(originalToolArgs);
        const requestBody = { 
          siteUrl: parsedArgs.siteUrl,
          sitemapIndex: parsedArgs.sitemapIndex, 
        };
        const response = await searchConsole.listSitemaps(googleAccessToken, requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'get_sitemap': {
        const parsedArgs = GetSitemapSchema.parse(originalToolArgs);
        const requestBody = { 
          siteUrl: parsedArgs.siteUrl,
          feedpath: parsedArgs.feedpath,
        };
        const response = await searchConsole.getSitemap(googleAccessToken, requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'submit_sitemap': {
        const parsedArgs = SubmitSitemapSchema.parse(originalToolArgs);
        const requestBody = { 
          siteUrl: parsedArgs.siteUrl,
          feedpath: parsedArgs.feedpath,
        };
        const response = await searchConsole.submitSitemap(googleAccessToken, requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error(`Error in CallToolRequest handler for tool '${request.params.name}':`, error); 
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.') || 'argument'}: ${e.message}`);
      throw new Error(`Invalid arguments for tool '${request.params.name}': ${messages.join('; ')}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unexpected error occurred in tool '${request.params.name}': ${String(error)}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP Server (OAuth2 Ready - v0.2.2) running on stdio'); // Updated version in log
}

runServer().catch((error) => {
  console.error('Fatal error running GSC MCP Server:', error);
  process.exit(1);
});
