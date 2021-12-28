/**
 * Helpers for mocking AWS services.
 */
export const awsMock = <T>(responseValue: T) => {
  return {
    promise: async () => {
      return Promise.resolve(responseValue);
    },
  };
};
