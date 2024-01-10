export function pick<T extends Object, P extends keyof T>(obj: T, props: P[]) {
  const ret = {} as Pick<T, P>;
  for (const p of props) {
    ret[p] = obj[p];
  }
  return ret;
}

export * from './request';

export function debounceAsync<T extends (...args: any[]) => any>(
  duration: number,
  fn: T
): (...args: any[]) => Promise<Awaited<ReturnType<T>>> {
  let timer;
  return function (...args: Parameters<T>) {
    return new Promise((resolve) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        resolve(fn(...args));
        timer = undefined;
      }, duration);
    });
  };
}
