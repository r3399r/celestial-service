import axios, { AxiosResponse } from 'axios';
import { injectable } from 'inversify';
import { LineUser, VerifyToken } from 'src/model/Line';

/**
 * Service class for line login related api
 */
@injectable()
export class LineLoginService {
  public async verifyAndGetUser(lineAccessToken: string): Promise<LineUser> {
    await this.verifyToken(lineAccessToken);

    return await this.getLineUser(lineAccessToken);
  }

  private async getLineUser(lineAccessToken: string): Promise<LineUser> {
    const res: AxiosResponse<LineUser> = await axios.get(
      'https://api.line.me/v2/profile',
      {
        headers: {
          Authorization: `Bearer ${lineAccessToken}`,
        },
      }
    );

    return res.data;
  }

  private async verifyToken(lineAccessToken: string): Promise<void> {
    const url: string = 'https://api.line.me/oauth2/v2.1/verify';
    const params = {
      access_token: lineAccessToken,
    };
    const res: AxiosResponse<VerifyToken> = await axios.get(
      `${url}?${new URLSearchParams(params)}`
    );
    if (res.data.client_id !== process.env.LINE_LOGIN_ID)
      throw new Error('wrong line client id');
    if (res.data.expires_in <= 0) throw new Error('line token expired');
  }
}
