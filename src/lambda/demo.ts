import { LambdaContext } from 'src/lambda/LambdaContext';
import {
  errorOutput,
  LambdaOutput,
  successOutput,
} from 'src/util/LambdaOutput';

export async function demo(
  _event: any,
  _context?: LambdaContext
): Promise<LambdaOutput> {
  try {
    const res = '';

    return successOutput(res);
  } catch (e) {
    return errorOutput(e);
  }
}
