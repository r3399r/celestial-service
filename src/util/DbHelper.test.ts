import { Doc } from 'src/model/DbBase';
import { compare } from './compare';
import {
  data2Record,
  entity,
  primaryAttribute,
  record2Data,
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
  leader: User;
  viceLeader?: User;
  member?: User[];
  teacher: User[];
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
  @relatedAttributeOne()
  public leader: User;
  @relatedAttributeOne()
  public viceLeader?: User;
  @relatedAttributeMany()
  public member?: User[];
  @relatedAttributeMany()
  public teacher: User[];
  public time: string;

  constructor(input: Class) {
    this.id = input.id;
    this.name = input.name;
    this.leader = new UserEntity(input.leader);
    this.viceLeader =
      input.viceLeader !== undefined
        ? new UserEntity(input.viceLeader)
        : undefined;
    this.member =
      input.member !== undefined
        ? input.member.map((v: User) => new UserEntity(v))
        : undefined;
    this.teacher = input.teacher.map((v: User) => new UserEntity(v));
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
  @relatedAttributeMany()
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
  let dummyClassData: Class;
  let dummyClassObjWithUndefined: Class;
  let dummyClassDataWithUndefined: Class;
  let dummyClassObjDuplicatedUser: Class;
  let dummyClassDataDuplicatedUser: Class;
  let dummyClassRecord1: Doc[];
  let dummyClassRecord2: Doc[];
  let dummyRelatedRecord1: Doc[];
  let dummyRelatedRecord2: Doc[];
  let dummyRelatedRecord3: Doc[];
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
      leader: dummyLeader,
      viceLeader: dummyViceLeader,
      member: [dummyClassmateA, dummyClassmateB],
      teacher: [dummyTeacherA, dummyTeacherB],
      time: 'test-time',
    };
    dummyClassData = new ClassEntity(dummyClassObj);
    dummyClassObjWithUndefined = {
      id: 'abc',
      name: 'test-name',
      leader: dummyLeader,
      teacher: [dummyTeacherA, dummyTeacherB],
      time: 'test-time',
    };
    dummyClassDataWithUndefined = new ClassEntity(dummyClassObjWithUndefined);
    dummyClassObjDuplicatedUser = {
      id: 'abcd',
      name: 'test-name-2',
      leader: dummyLeader,
      viceLeader: dummyLeader,
      member: [dummyLeader, dummyClassmateA, dummyClassmateB],
      teacher: [dummyTeacherA, dummyTeacherB],
      time: 'test-time',
    };
    dummyClassDataDuplicatedUser = new ClassEntity(dummyClassObjDuplicatedUser);
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
    dummyRelatedRecord1 = [
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#124`,
        attribute: undefined,
        ...dummyLeader,
      },
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#128`,
        attribute: undefined,
        ...dummyTeacherA,
      },
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#129`,
        attribute: undefined,
        ...dummyTeacherB,
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
    dummyRelatedRecord2 = [
      ...dummyRelatedRecord1,
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#125`,
        attribute: undefined,
        ...dummyViceLeader,
      },
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#126`,
        attribute: undefined,
        ...dummyClassmateA,
      },
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#127`,
        attribute: undefined,
        ...dummyClassmateB,
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
    dummyRelatedRecord3 = [
      ...dummyRelatedRecord1,
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#126`,
        attribute: undefined,
        ...dummyClassmateA,
      },
      {
        pk: `${alias}#user`,
        sk: `${alias}#user#127`,
        attribute: undefined,
        ...dummyClassmateB,
      },
    ];
  });

  it('data2Record should work', () => {
    expect(data2Record(new UserEntity(dummyLeader), alias)).toStrictEqual([
      {
        pk: `${alias}#user#124`,
        sk: `${alias}#user#124`,
        attribute: undefined,
        ...dummyLeader,
      },
    ]);
    expect(
      data2Record(dummyClassData, alias).sort(compare('sk'))
    ).toStrictEqual(dummyClassRecord2.sort(compare('sk')));
  });

  it('data2Record should work if some attribute is empty', () => {
    expect(data2Record(dummyClassDataWithUndefined, alias)).toStrictEqual(
      dummyClassRecord1
    );
  });

  it('data2Record should work if user is put multiple times', () => {
    expect(data2Record(dummyClassDataDuplicatedUser, alias)).toStrictEqual(
      dummyClassRecordDuplicatedUser
    );
  });

  it('data2Record should fail', () => {
    expect(() =>
      data2Record(new WrongClassEntity({ id: 'a', member: 'b' }), alias)
    ).toThrowError('wrong format. member should be an array');
  });

  it('record2Data should work', () => {
    expect(record2Data(dummyClassRecord2, dummyRelatedRecord2)).toStrictEqual(
      dummyClassObj
    );
    expect(record2Data(dummyClassRecord1, dummyRelatedRecord1)).toStrictEqual(
      dummyClassObjWithUndefined
    );
  });

  it('record2Data should work if user is put multiple times', () => {
    expect(
      record2Data(dummyClassRecordDuplicatedUser, dummyRelatedRecord3)
    ).toStrictEqual(dummyClassObjDuplicatedUser);
  });
});
