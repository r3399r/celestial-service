import { LambdaOutput } from 'src/model/Lambda';

export function successOutput<T>(res: T): LambdaOutput {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify(res),
  };
}

export function errorOutput(e: unknown): LambdaOutput {
  const error: Error = e as Error;

  return {
    statusCode: 400,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify({
      code: 400,
      message: error.message,
    }),
  };
}
