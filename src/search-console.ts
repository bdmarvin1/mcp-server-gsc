import { google, searchconsole_v1, webmasters_v3 } from 'googleapis';
import { Auth } from 'google-auth-library'; // Import Auth for OAuth2Client type

// Type definitions remain the same
type SearchanalyticsQueryRequest =
  webmasters_v3.Params$Resource$Searchanalytics$Query['requestBody'];
type ListSitemapsRequest = webmasters_v3.Params$Resource$Sitemaps$List;
type GetSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Get;
type SubmitSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Submit;
type IndexInspectRequest =
  searchconsole_v1.Params$Resource$Urlinspection$Index$Inspect['requestBody'];

export class SearchConsoleService {
  // REMOVED: private auth: GoogleAuth;

  constructor() {
    // Constructor is now empty or can be used for other general initializations
    // REMOVED: Initialization of this.auth
  }

  private getOAuth2Client(accessToken: string): Auth.OAuth2Client {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  private getWebmasters(accessToken: string) { // Added accessToken parameter
    const authClient = this.getOAuth2Client(accessToken);
    return google.webmasters({
      version: 'v3',
      auth: authClient, // Use the OAuth2 client
    } as webmasters_v3.Options);
  }

  private getSearchConsole(accessToken: string) { // Added accessToken parameter
    const authClient = this.getOAuth2Client(accessToken);
    return google.searchconsole({
      version: 'v1',
      auth: authClient, // Use the OAuth2 client
    } as searchconsole_v1.Options);
  }

  private normalizeUrl(url: string): string {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      // Prefer sc-domain for properties, but ensure it's correctly formed.
      // The original logic might be too simplistic if siteUrl can be a full path.
      // For now, keeping existing logic, but this might need review based on GSC requirements.
      return `sc-domain:${parsedUrl.hostname}`;
    }
    // This case seems unlikely if the input is always a valid site URL for GSC.
    // GSC typically expects full URLs like https://www.example.com/ or sc-domain:example.com
    return `https://${url}`; // Or handle as an error if format is unexpected
  }

  private async handlePermissionError<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      // Ensure err is an Error instance and message exists
      if (err instanceof Error && err.message && err.message.toLowerCase().includes('permission')) {
        return await fallbackOperation();
      }
      throw err;
    }
  }

  async searchAnalytics(accessToken: string, siteUrl: string, requestBody: SearchanalyticsQueryRequest) {
    const webmasters = this.getWebmasters(accessToken); // Pass accessToken
    // Note: The original normalizeUrl logic in handlePermissionError might need re-evaluation.
    // If siteUrl is always expected in a specific format by GSC for this call,
    // normalization might need to happen before this call or be more robust.
    return this.handlePermissionError(
      () => webmasters.searchanalytics.query({ siteUrl, requestBody }),
      () => webmasters.searchanalytics.query({ siteUrl: this.normalizeUrl(siteUrl), requestBody }),
    );
  }

  async listSites(accessToken: string) {
    const webmasters = this.getWebmasters(accessToken); // Pass accessToken
    return webmasters.sites.list();
  }

  async listSitemaps(accessToken: string, requestBody: ListSitemapsRequest) {
    const webmasters = this.getWebmasters(accessToken); // Pass accessToken
    return this.handlePermissionError(
      () => webmasters.sitemaps.list(requestBody),
      () =>
        webmasters.sitemaps.list({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!), // siteUrl is non-null here per original
        }),
    );
  }

  async getSitemap(accessToken: string, requestBody: GetSitemapRequest) {
    const webmasters = this.getWebmasters(accessToken); // Pass accessToken
    return this.handlePermissionError(
      () => webmasters.sitemaps.get(requestBody),
      () =>
        webmasters.sitemaps.get({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!), // siteUrl is non-null here
        }),
    );
  }

  async submitSitemap(accessToken: string, requestBody: SubmitSitemapRequest) {
    const webmasters = this.getWebmasters(accessToken); // Pass accessToken
    return this.handlePermissionError(
      () => webmasters.sitemaps.submit(requestBody),
      () =>
        webmasters.sitemaps.submit({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!), // siteUrl is non-null here
        }),
    );
  }

  async indexInspect(accessToken: string, requestBody: IndexInspectRequest) {
    const searchConsole = this.getSearchConsole(accessToken); // Pass accessToken
    // Assuming requestBody for indexInspect already contains the correct siteUrl and inspectionUrl
    // and doesn't need the same permission-based fallback normalization.
    // If it does, this method might also need to use handlePermissionError.
    return searchConsole.urlInspection.index.inspect({ requestBody });
  }
}
