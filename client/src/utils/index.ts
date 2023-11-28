export function pick<T extends Object, P extends keyof T>(obj: T, props: P[]) {
  const ret = {} as Pick<T, P>;
  for (const p of props) {
    ret[p] = obj[p];
  }
  return ret;
}

export * from './request';
