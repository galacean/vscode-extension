declare module 'prettydiff/js/prettydiff' {
  type PrettyDiffFn = (() => string) & {
    options: Record<string, any>;
  };

  const prettydiff: PrettyDiffFn;
  export = prettydiff;
}
