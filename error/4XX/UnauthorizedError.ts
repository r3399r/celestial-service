import { HttpError } from '../HttpError';

/**
 * unauthorized error class (401)
 */
export class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    super(401, message ?? 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}
