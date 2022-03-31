import 'reflect-metadata';
import { BadRequestError } from 'src/error';
import { Doc } from 'src/model/DbBase';

/**
 * This util is a practice for the adjacency list design patter
 * use decorator to configure the relationship
 * example can be found in unit test
 */
export function entity(entityName: string): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('entity', entityName, target.prototype);
  };
}

export function primaryAttribute(): PropertyDecorator {
  return (target: Object, key: string | symbol) => {
    Reflect.defineMetadata('primaryAttribute', key, target);
  };
}

export function relatedAttributeOne(schemaName: string): PropertyDecorator {
  return (target: Object, key: string | symbol) => {
    const attributes = Reflect.getMetadata('relatedAttributeOne', target) ?? [];
    Reflect.defineMetadata(
      'relatedAttributeOne',
      [...attributes, `${String(key)}::${schemaName}`],
      target
    );
  };
}

export function relatedAttributeMany(schemaName: string): PropertyDecorator {
  return (target: Object, key: string | symbol) => {
    const attributes =
      Reflect.getMetadata('relatedAttributeMany', target) ?? [];
    Reflect.defineMetadata(
      'relatedAttributeMany',
      [...attributes, `${String(key)}::${schemaName}`],
      target
    );
  };
}

export function data2Record<T>(
  input: T,
  alias: string,
  pk?: string,
  attribute?: string
): Doc[] {
  const entityName: string | undefined = Reflect.getMetadata('entity', input);
  if (entityName === undefined)
    throw new BadRequestError('input entity has no entityName');
  const primary: keyof T = Reflect.getMetadata('primaryAttribute', input);
  const key = `${alias}#${entityName}#${input[primary]}`;

  const main = {
    pk: pk ?? key,
    sk: key,
    attribute,
    ...input,
  };
  if (pk !== undefined) return [{ pk, sk: key, attribute }];

  const related: Doc[] = [];
  const skSet = new Set<string>();

  const attributesOne = Reflect.getMetadata('relatedAttributeOne', input) ?? [];
  attributesOne.forEach((v: string) => {
    const attributeName = v.split('::')[0];
    const schema = v.split('::')[1];
    const attributeValue = input[attributeName as keyof T] as unknown as string;
    delete main[attributeName as keyof T];
    if (attributeValue !== undefined) {
      related.push({
        pk: key,
        sk: `${alias}#${schema}#${attributeValue}`,
        attribute: `${attributeName}#one`,
      });
      skSet.add(`${alias}#${schema}#${attributeValue}`);
    }
  });

  const attributesMany =
    Reflect.getMetadata('relatedAttributeMany', input) ?? [];
  attributesMany.forEach((v: string) => {
    const attributeName = v.split('::')[0];
    const schema = v.split('::')[1];
    const attributeValue = input[
      attributeName as keyof T
    ] as unknown as string[];
    delete main[attributeName as keyof T];
    if (attributeValue !== undefined) {
      if (!Array.isArray(attributeValue))
        throw new BadRequestError(
          `wrong format. ${attributeName} should be an array`
        );
      attributeValue.forEach((o) => {
        related.push({
          pk: key,
          sk: `${alias}#${schema}#${o}`,
          attribute: `${attributeName}#many`,
        });
        skSet.add(`${alias}#${schema}#${o}`);
      });
    }
  });

  const mergedRelated: Doc[] = [];
  skSet.forEach((sk: string) => {
    const relatedBySk = related.filter((v: Doc) => v.sk === sk);
    const mergedAttributes = relatedBySk
      .map((v: Doc) => v.attribute)
      .join('::');
    mergedRelated.push({ ...relatedBySk[0], attribute: mergedAttributes });
  });

  return [main, ...mergedRelated];
}
