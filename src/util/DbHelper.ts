import 'reflect-metadata';
import { Base } from 'src/model/DbBase';

/**
 * Example of DB Class:
 * type Class = {
 *   id: string;
 *   name: string;
 *   weekDay: string;
 *   time: string;
 * }
 *
 * @entity('class')
 * export class ClassEntity implements Class {
 *   @primaryAttribute()
 *   public id: string;
 *   public name: string;
 *   public weekDay: string;
 *   public time: string;
 *
 *   constructor(input: Class) {
 *     this.id = input.id
 *     this.name = input.name
 *     this.weekDay = input.weekDay
 *     this.time = input.time
 *   }
 * }
 *
 * And it generates something like:
 * {
 *     pk: 'demo#class#f0079556-c07e-466f-9b39-d7e4e380b86c',
 *     sk: 'demo#class#f0079556-c07e-466f-9b39-d7e4e380b86c',
 *     name: 'mathA',
 *     weekDay: 'saturday',
 *     time: '09:00-11:30'
 * }
 */

export function entity(entityName: string): (target: Function) => void {
  return (target: Function) => {
    Reflect.defineMetadata('Entity', entityName, target.prototype);
  };
}

export function primaryAttribute(): (
  target: Object,
  propertyKey: string
) => void {
  return (target: Object, propertyKey: string) => {
    Reflect.defineMetadata('PrimaryAttribute', propertyKey, target);
  };
}

export function generateData<T>(
  input: T,
  alias: string
): Base & Omit<T, keyof T> {
  const entityName: string = Reflect.getMetadata('Entity', input);
  const key: keyof T = Reflect.getMetadata('PrimaryAttribute', input);
  const pk = `${alias}#${entityName}#${input[key]}`;

  return { pk, sk: pk, ...input };
}

export function generateRelationalData<T, K>(
  parent: T,
  child: K,
  alias: string
): Base & Omit<K, keyof K> {
  const parentEntity: string = Reflect.getMetadata('Entity', parent);
  const parentKey: keyof T = Reflect.getMetadata('PrimaryAttribute', parent);
  const childEntity: string = Reflect.getMetadata('Entity', child);
  const childKey: keyof K = Reflect.getMetadata('PrimaryAttribute', child);

  const pk = `${alias}#${parentEntity}#${parent[parentKey]}`;
  const sk = `${alias}#${childEntity}#${child[childKey]}`;

  return { pk, sk, ...child };
}

export function record2Data<T>(record: Base & { [key: string]: any }): T {
  const { pk, sk, ...rest } = record;

  return rest as T;
}
