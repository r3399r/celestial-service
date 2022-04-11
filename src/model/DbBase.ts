type DocBase = {
  pk: string;
  sk: string;
  attribute: string | undefined;
};

export type Doc = DocBase & { [key: string]: any };

export type DbBase = {
  dateCreated?: number;
  dateUpdated?: number;
  dateDeleted?: number;
};

export interface ModelBase {
  find(id: string): Promise<unknown>;
  findAll(): Promise<unknown[]>;
  create(data: unknown): Promise<void>;
  replace(data: unknown): Promise<void>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}
