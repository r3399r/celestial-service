export function compare<T>(key: keyof T): (a: T, b: T) => number {
  return (a: T, b: T) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;

    return 0;
  };
}
