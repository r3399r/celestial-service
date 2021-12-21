import 'reflect-metadata';
import { Base } from 'src/model/DbBase';

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

export function relatedAttributeOne(): PropertyDecorator {
  return (target: Object, key: string | symbol) => {
    const attributes = Reflect.getMetadata('relatedAttributeOne', target) ?? [];
    Reflect.defineMetadata('relatedAttributeOne', [...attributes, key], target);
  };
}

export function relatedAttributeMany(): PropertyDecorator {
  return (target: Object, key: string | symbol) => {
    const attributes =
      Reflect.getMetadata('relatedAttributeMany', target) ?? [];
    Reflect.defineMetadata(
      'relatedAttributeMany',
      [...attributes, key],
      target
    );
  };
}

export function data2Record<T>(
  input: T,
  alias: string,
  pk?: string,
  attribute?: string
): (Base & { [key: string]: any })[] {
  const entityName: string = Reflect.getMetadata('entity', input);
  const primary: keyof T = Reflect.getMetadata('primaryAttribute', input);
  const key = `${alias}#${entityName}#${input[primary]}`;

  const main = {
    pk: pk ?? key,
    sk: key,
    attribute,
    ...input,
  };

  const relatedOne: (Base & { [key: string]: any })[] = [];
  const relatedMany: (Base & { [key: string]: any })[] = [];
  if (pk === undefined) {
    const attributesOne =
      Reflect.getMetadata('relatedAttributeOne', input) ?? [];
    attributesOne.forEach((v: string) => {
      const item = input[v as keyof T];
      delete main[v as keyof T];
      if (item !== undefined)
        relatedOne.push(data2Record(item, alias, key, `${v}#one`)[0]);
    });

    const attributesMany =
      Reflect.getMetadata('relatedAttributeMany', input) ?? [];
    attributesMany.forEach((v: string) => {
      const items = input[v as keyof T];
      delete main[v as keyof T];
      if (items !== undefined) {
        if (!Array.isArray(items))
          throw new Error(`wrong format. ${v} should be an array`);
        items.forEach((o: any) => {
          relatedMany.push(data2Record(o, alias, key, `${v}#many`)[0]);
        });
      }
    });
  }

  return [main, ...relatedOne, ...relatedMany];
}

export function record2Data<T>(record: (Base & { [key: string]: any })[]): T {
  let data: Partial<T> = {};
  record.forEach((v: Base & { [key: string]: any }) => {
    const { pk, sk, attribute, ...rest } = v;
    if (v.attribute === undefined) data = { ...data, ...rest };
    else {
      const attributeName: keyof T = v.attribute.split('#')[0] as keyof T;
      const attributeType = v.attribute.split('#')[1];

      if (attributeType === 'one') data = { ...data, [attributeName]: rest };
      else if (data[attributeName] === undefined)
        data = { ...data, [attributeName]: [rest] };
      else {
        const oldAttribute = data[attributeName];
        if (Array.isArray(oldAttribute))
          data = { ...data, [attributeName]: [...oldAttribute, rest] };
      }
    }
  });

  return data as T;
}
