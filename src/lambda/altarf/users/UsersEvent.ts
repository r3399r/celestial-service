export interface UsersEvent {
  httpMethod: string;
  body: string | null;
  headers: {
    'x-api-line'?: string;
  };
}
