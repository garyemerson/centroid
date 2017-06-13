declare module native {
  function init(): void;
  function hello(): string;
  function getRandNum(max: number): number;
  function getMax(arr: number[]): number;
  function oneHemisphere(latLons: number[][]): number;
}

export = native;
