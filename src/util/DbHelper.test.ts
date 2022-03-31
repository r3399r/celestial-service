import { Doc } from 'src/model/DbBase';
import { compare } from './compare';
import {
  data2Record,
  entity,
  primaryAttribute,
  relatedAttributeMany,
  relatedAttributeOne,
} from './DbHelper';

type User = {
  id: string;
  name: string;
};

type Class = {
  id: string;
  name: string;
  leader: string;
  viceLeader?: string;
  member?: string[];
  teacher: string[];
  time: string;
};

/**
 * test entity user
 */
@entity('user')
class UserEntity implements User {
  @primaryAttribute()
  public id: string;
  public name: string;

  constructor(input: User) {
    this.id = input.id;
    this.name = input.name;
  }
}

/**
 * test entity class
 */
@entity('class')
class ClassEntity implements Class {
  @primaryAttribute()
  public id: string;
  public name: string;
  @relatedAttributeOne('user')
  public leader: string;
  @relatedAttributeOne('user')
  public viceLeader?: string;
  @relatedAttributeMany('user')
  public member?: string[];
  @relatedAttributeMany('user')
  public teacher: string[];
  public time: string;

  constructor(input: Class) {
    this.id = input.id;
    this.name = input.name;
    this.leader = input.leader;
    this.viceLeader =
      input.viceLeader !== undefined ? input.viceLeader : undefined;
    this.member = input.member !== undefined ? input.member : undefined;
    this.teacher = input.teacher;
    this.time = input.time;
  }
}

/**
 * test entity class
 */
@entity('wrongclass')
class WrongClassEntity {
  @primaryAttribute()
  public id: string;
  @relatedAttributeMany('user')
  public member: User;

  constructor(input: any) {
    this.id = input.id;
    this.member = new UserEntity(input.member);
  }
}

/**
 * Tests of db helper
 */
describe('DbHelper', () => {
  let dummyClassObj: Class;
  let dummyClassObjWithUndefined: Class;
  let dummyClassObjDuplicatedUser: Class;
  let dummyClassRecord1: Doc[];
  let dummyClassRecord2: Doc[];
  let dummyClassRecordDuplicatedUser: Doc[];
  let dummyLeader: User;
  let dummyViceLeader: User;
  let dummyClassmateA: User;
  let dummyClassmateB: User;
  let dummyTeacherA: User;
  let dummyTeacherB: User;
  const alias = 'test-alias';

  beforeAll(() => {
    dummyLeader = { id: '124', name: 'Wang' };
    dummyViceLeader = { id: '125', name: 'Chen' };
    dummyClassmateA = { id: '126', name: 'Chang' };
    dummyClassmateB = { id: '127', name: 'Lin' };
    dummyTeacherA = { id: '128', name: 'Lai' };
    dummyTeacherB = { id: '129', name: 'Liu' };
    dummyClassObj = {
      id: 'abc',
      name: 'test-name',
      leader: dummyLeader.id,
      viceLeader: dummyViceLeader.id,
      member: [dummyClassmateA.id, dummyClassmateB.id],
      teacher: [dummyTeacherA.id, dummyTeacherB.id],
      time: 'test-time',
    };
    dummyClassObjWithUndefined = {
      id: 'abc',
      name: 'test-name',
      leader: dummyLeader.id,
      teacher: [dummyTeacherA.id, dummyTeacherB.id],
      time: 'test-time',
    };
    dummyClassObjDuplicatedUser = {
      id: 'abcd',
      name: 'test-name-2',
      leader: dummyLeader.id,
      viceLeader: dummyLeader.id,
      member: [dummyLeader.id, dummyClassmateA.id, dummyClassmateB.id],
      teacher: [dummyTeacherA.id, dummyTeacherB.id],
      time: 'test-time',
    };
    dummyClassRecord1 = [
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#class#abc`,
        attribute: undefined,
        id: 'abc',
        name: 'test-name',
        time: 'test-time',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#124`,
        attribute: 'leader#one',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#128`,
        attribute: 'teacher#many',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#129`,
        attribute: 'teacher#many',
      },
    ];
    dummyClassRecord2 = [
      ...dummyClassRecord1,
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#125`,
        attribute: 'viceLeader#one',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#126`,
        attribute: 'member#many',
      },
      {
        pk: `${alias}#class#abc`,
        sk: `${alias}#user#127`,
        attribute: 'member#many',
      },
    ];
    dummyClassRecordDuplicatedUser = [
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#class#abcd`,
        attribute: undefined,
        id: 'abcd',
        name: 'test-name-2',
        time: 'test-time',
      },
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#user#124`,
        attribute: 'leader#one::viceLeader#one::member#many',
      },
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#user#126`,
        attribute: 'member#many',
      },
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#user#127`,
        attribute: 'member#many',
      },
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#user#128`,
        attribute: 'teacher#many',
      },
      {
        pk: `${alias}#class#abcd`,
        sk: `${alias}#user#129`,
        attribute: 'teacher#many',
      },
    ];
  });

  describe('data2Record', () => {
    it('should work', () => {
      expect(data2Record(new UserEntity(dummyLeader), alias)).toStrictEqual([
        {
          pk: `${alias}#user#124`,
          sk: `${alias}#user#124`,
          attribute: undefined,
          ...dummyLeader,
        },
      ]);
      expect(
        data2Record(new ClassEntity(dummyClassObj), alias).sort(compare('sk'))
      ).toStrictEqual(dummyClassRecord2.sort(compare('sk')));
    });

    it('should work if some attribute is empty', () => {
      expect(
        data2Record(new ClassEntity(dummyClassObjWithUndefined), alias)
      ).toStrictEqual(dummyClassRecord1);
    });

    it('should work if user is put multiple times', () => {
      expect(
        data2Record(new ClassEntity(dummyClassObjDuplicatedUser), alias)
      ).toStrictEqual(dummyClassRecordDuplicatedUser);
    });

    it('should fail for wrong format', () => {
      expect(() =>
        data2Record(new WrongClassEntity({ id: 'a', member: 'b' }), alias)
      ).toThrowError('wrong format. member should be an array');
    });

    it('should fail without entity', () => {
      expect(() => data2Record(dummyLeader, alias)).toThrowError(
        'input entity has no entityName'
      );
    });
  });
});
