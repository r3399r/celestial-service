import { difference, intersection } from './setTheory';

describe('setTheory', () => {
  const numberSet1 = [1, 2, 3, 4, 5];
  const numberSet2 = [4, 5, 6, 7, 8];
  const objectSet1 = [
    { a: 1, b: 1 },
    { a: 4, b: 4 },
    { a: 2, b: 2 },
    { a: 3, b: 3 },
  ];
  const objectSet2 = [
    { a: 3, b: 3 },
    { a: 4, b: 4 },
    { a: 5, b: 5 },
  ];

  it('intersection should work', () => {
    expect(intersection(numberSet1, numberSet2)).toStrictEqual([4, 5]);
  });

  it('intersection should work with array of object', () => {
    expect(intersection(objectSet1, objectSet2)).toEqual([
      { a: 4, b: 4 },
      { a: 3, b: 3 },
    ]);
  });

  it('difference should work', () => {
    expect(difference(numberSet1, numberSet2)).toStrictEqual([1, 2, 3]);
    expect(difference(numberSet2, numberSet1)).toStrictEqual([6, 7, 8]);
  });

  it('difference should work with array of object', () => {
    expect(difference(objectSet1, objectSet2)).toEqual([
      { a: 1, b: 1 },
      { a: 2, b: 2 },
    ]);
    expect(difference(objectSet2, objectSet1)).toEqual([{ a: 5, b: 5 }]);
  });
});
