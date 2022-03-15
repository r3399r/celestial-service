type Base = {
  pk: string;
  sk: string;
  attribute: string | undefined;
};

export type Doc = Base & { [key: string]: any };
