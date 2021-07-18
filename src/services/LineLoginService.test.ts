import axios from 'axios';
import { bindings } from 'src/bindings';
import { LineUser, VerifyToken } from 'src/model/Line';
import { LineLoginService } from './LineLoginService';

jest.mock('axios');

/**
 * Tests of the LineLoginService class.
 */
describe('LineLoginService', () => {
  let lineLoginService: LineLoginService;
  let mockAxios: jest.Mocked<typeof axios>;
  let dummyVerifyResult: VerifyToken;
  let dummyLineUser: LineUser;

  beforeAll(() => {
    process.env.LINE_LOGIN_ID = '1123456';
    dummyVerifyResult = {
      scope: 'profile',
      client_id: '1123456',
      expires_in: 2591659,
    };
    dummyLineUser = {
      userId: 'testId',
      pictureUrl: 'url',
      displayName: 'name',
      statusMessage: 'message',
    };
  });

  beforeEach(() => {
    lineLoginService = bindings.get<LineLoginService>(LineLoginService);
    mockAxios = axios as jest.Mocked<typeof axios>;
  });

  it('verifyAndGetUser should work', async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: dummyVerifyResult })
      .mockResolvedValueOnce({ data: dummyLineUser });
    const lineUser = await lineLoginService.verifyAndGetUser('abcde');
    expect(lineUser).toStrictEqual(dummyLineUser);
    expect(mockAxios.get).toBeCalledTimes(2);
  });

  it('verifyAndGetUser should fail when client id is wrong', async () => {
    mockAxios.get.mockResolvedValueOnce({
      data: { ...dummyVerifyResult, client_id: '123' },
    });
    await expect(lineLoginService.verifyAndGetUser('abcde')).rejects.toThrow(
      'wrong line client id'
    );
  });

  it('verifyAndGetUser should fail when token is expired', async () => {
    mockAxios.get.mockResolvedValueOnce({
      data: { ...dummyVerifyResult, expires_in: 0 },
    });
    await expect(lineLoginService.verifyAndGetUser('abcde')).rejects.toThrow(
      'line token expired'
    );
  });
});
