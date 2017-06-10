declare module native {
  function init(): void;
  function hello(): string;
  function getRandNum(max: number): number;
}

export = native;
