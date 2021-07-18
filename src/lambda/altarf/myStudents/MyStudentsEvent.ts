export interface MyStudentsEvent {
  httpMethod: string;
  body: string | null;
  headers: {
    'x-api-line'?: string;
  };
}
