import { errorOutput, successOutput } from './LambdaOutput';

/**
 * Tests of lambda output
 */
describe('LambdaOutput', () => {
  it('successOutput should work', () => {
    expect(successOutput({ a: 1 })).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it('errorOutput should work', () => {
    expect(errorOutput(new Error('a'))).toEqual({
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      },
      body: JSON.stringify({
        code: 400,
        message: 'a',
      }),
    });
  });
});
