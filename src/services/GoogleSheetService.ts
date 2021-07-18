import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { inject, injectable } from 'inversify';

/**
 * Service class for google sheet
 */
@injectable()
export class GoogleSheetService {
  @inject(GoogleSpreadsheet)
  private readonly googleSpreadsheet!: GoogleSpreadsheet;

  public async getRows(sheetId: string): Promise<GoogleSpreadsheetRow[]> {
    await this.googleSpreadsheet.useServiceAccountAuth({
      client_email: process.env.AUTH_CLIENT as string,
      private_key: (process.env.AUTH_KEY as string).replace(/\\n/g, '\n'),
    });
    await this.googleSpreadsheet.loadInfo(); // loads document properties and worksheets

    const sheet = this.googleSpreadsheet.sheetsById[sheetId];

    return await sheet.getRows();
  }
}
