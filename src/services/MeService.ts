import { inject, injectable } from 'inversify';
import { DbUser } from 'src/model/User';
import { AltarfUserService } from './users/AltarfUserService';

/**
 * Service class for me
 */
@injectable()
export class MeService {
  @inject(AltarfUserService)
  private readonly userService!: AltarfUserService;

  public async getMe(lineUserId: string): Promise<DbUser> {
    return await this.userService.getUserByLineId(lineUserId);
  }
}
