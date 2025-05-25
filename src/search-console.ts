import { google, searchconsole_v1, webmasters_v3 } from 'googleapis';
// Corrected: No direct import of 'Auth' or 'auth' needed here for OAuth2Client type if using google.auth.OAuth2Client

// Type definitions remain the same
type SearchanalyticsQueryRequest =
  webmasters_v3.Params$Resource$Searchanalytics$Query['requestBody'];
type ListSitemapsRequest = webmasters_v3.Params$Resource$Sitemaps$List;
type GetSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Get;
type SubmitSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Submit;
type IndexInspectRequest =
  searchconsole_v1.Params$Resource$Urlinspection$Index$Inspect['requestBody'];

export class SearchConsoleService {

  constructor() {
    // Constructor is now empty
  }

  private getOAuth2Client(accessToken: string): google.auth.OAuth2Client { // Use google.auth.OAuth2Client for type
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  private getWebmasters(accessToken: string) {
    const authClient = this.getOAuth2Client(accessToken);
    return google.webmasters({
      version: 'v3',
      auth: authClient,
    } as webmasters_v3.Options);
  }

  private getSearchConsole(accessToken: string) {
    const authClient = this.getOAuth2Client(accessToken);
    return google.searchconsole({
      version: 'v1',
      auth: authClient,
    } as searchconsole_v1.Options);
  }

  private normalizeUrl(url: string): string {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return `sc-domain:${parsedUrl.hostname}`;
    }
    return `https://${url}`;
  }

  private async handlePermissionError<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof Error && err.message && err.message.toLowerCase().includes('permission')) {
        return await fallbackOperation();
      }
      throw err;
    }
  }

  async searchAnalytics(accessToken: string, siteUrl: string, requestBody: SearchanalyticsQueryRequest) {
    const webmasters = this.getWebmasters(accessToken);
    return this.handlePermissionError(
      () => webmasters.searchanalytics.query({ siteUrl, requestBody }),
      () => webmasters.searchanalytics.query({ siteUrl: this.normalizeUrl(siteUrl), requestBody }),
    );
  }

  async listSites(accessToken: string) {
    const webmasters = this.getWebmasters(accessToken);
    return webmasters.sites.list();
  }

  async listSitemaps(accessToken: string, requestBody: ListSitemapsRequest) {
    const webmasters = this.getWebmasters(accessToken);
    return this.handlePermissionError(
      () => webmasters.sitemaps.list(requestBody),
      () =>
        webmasters.sitemaps.list({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async getSitemap(accessToken: string, requestBody: GetSitemapRequest) {
    const webmasters = this.getWebmasters(accessToken);
    return this.handlePermissionError(
      () => webmasters.sitemaps.get(requestBody),
      () =>
        webmasters.sitemaps.get({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async submitSitemap(accessToken: string, requestBody: SubmitSitemapRequest) {
    const webmasters = this.getWebmasters(accessToken);
    return this.handlePermissionError(
      () => webmasters.sitemaps.submit(requestBody),
      () =>
        webmasters.sitemaps.submit({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async indexInspect(accessToken: string, requestBody: IndexInspectRequest) {
    const searchConsole = this.getSearchConsole(accessToken);
    return searchConsole.urlInspection.index.inspect({ requestBody });
  }
}
