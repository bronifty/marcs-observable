export interface IObservable {
  value: any;
  subscribe(handler: (current: any, previous: any) => void, signal?: AbortSignal): () => void;
  publish(): void;
  push(item: any): void;
  compute(): void;
  _dependencyArray: IObservable[];
}
export declare class Observable implements IObservable {
  private _value: any;
  private _previousValue: any;
  private _subscribers: any;
  private _valueFn: any;
  private _valueFnArgs: any;
  static _computeActive: IObservable | null;
  _dependencyArray: IObservable[];
  private _lastPromiseId: any;
  private _isComputing: any;
  private _promiseQueue: any;
  private _generationCounter: any;
  constructor(init: Function | any, ...args: any[]);
  get value(): any;
  set value(_newVal: any);
  subscribe: (handler: Function, signal: AbortSignal) => (() => void);
  publish: () => void;
  computeHandler: () => any;
  compute: () => void;
  private bindComputedObservable: any;
  push: (item: any) => void;
  static delay(ms: number): any;
}
export declare class ObservableFactory {
  static create(initialValue: any, ...args: any[]): IObservable;
}
/** marcsObservable is the default export */ export default function marcsObservable(initialValue: any, ...args: any[]): IObservable;
//# sourceMappingURL=main.d.ts.map