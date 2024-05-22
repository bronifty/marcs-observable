import { ObservableFactory } from "./main.ts";

describe("Observable Tests", () => {
  it("Observable publish and subscribe", () => {
    const observable = ObservableFactory.create(41);
    let trackedVal: number | null = null;
    observable.subscribe((current: number) => {
      console.log("Subscription callback called with value:", current);
      trackedVal = current;
    });
    console.log("Setting value to 42");
    observable.value = 42;
    expect(trackedVal).toBe(42);
    console.log("Setting value to 43");
    observable.value = 43;
    expect(trackedVal).toBe(43);
  });

  it("Observable publish on array replacement, not modification", () => {
    const observable = ObservableFactory.create([]);
    let count = 0;
    observable.subscribe(() => count++);
    const arr = [1, 2];
    observable.value = arr;
    arr.push(3);
    observable.value = [1, 2, 3];
    expect(count).toBe(2);
    arr.push(4);
    expect(count).toBe(2);
    observable.value = [1, 2, 3, 4];
    expect(count).toBe(3);
  });

  it("Observable sets value with a function and arguments", () => {
    const func = (a: number, b: number) => a + b;
    const observable = ObservableFactory.create(func, 3, 4);
    expect(observable.value).toBe(7);
  });

  it("Observable sets value with a function and variable number of arguments", () => {
    const func = (...args: number[]) =>
      args.reduce((acc, value) => acc + value, 0);
    const observable = ObservableFactory.create(func, 3, 4, 5, 6);
    expect(observable.value).toBe(18);
  });

  it("Observable recomputes value when child observables change", () => {
    const childObservable = ObservableFactory.create(5);
    const func = () => childObservable.value * 2;
    const parentObservable = ObservableFactory.create(func);
    expect(parentObservable.value).toBe(10);
    childObservable.value = 10;
    expect(parentObservable.value).toBe(20);
  });

  it("ObservableValue compute with async function", async () => {
    const func = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 42;
    };
    const observable = ObservableFactory.create(func);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(observable.value).toBe(42);
  });

  it("Overwrite computed observable value without changing computed function", () => {
    const logChanges = (current: any, previous: any) => {
      console.log(`Changed to ${current} from ${previous}`);
    };
    const i = ObservableFactory.create(1);
    const j = ObservableFactory.create(10);
    const func = () => i.value;
    const computed = ObservableFactory.create(func);
    computed.subscribe(logChanges);
    console.log(`computed.value: ${computed.value}`);
    expect(computed.value).toBe(1);
    i.value = 2;
    expect(computed.value).toBe(2);
    computed.value = j.value;
    expect(computed.value).toBe(10);
    j.value = 2;
    expect(computed.value).toBe(10);
    i.value = 3;
    expect(computed.value).toBe(3);
  });
});

describe("cancel stale requests", () => {
  it("should handle stale requests correctly", async () => {
    // create a child promise with request delay 100ms
    const setVariableDelay = (variableTime: number) => {
      return new Promise((resolve) => setTimeout(resolve, variableTime));
    };

    // This will set a delay of 2 seconds

    function childFnPromise() {
      return new Promise((resolve) => setTimeout(resolve, 100)).then(() => 1);
    }
    function parentFn() {
      const childValue = child.value;
      if (childValue instanceof Promise) {
        return childValue.then((val) => val + 1);
      } else {
        return childValue + 1;
      }
    }
    function grandparentFn() {
      const parentValue = parent.value;
      if (parentValue instanceof Promise) {
        return parentValue.then((val) => val + 1);
      } else {
        return parentValue + 1;
      }
    }
    // init the child and computed parent observables
    const child = ObservableFactory.create(childFnPromise);
    const parent = ObservableFactory.create(parentFn);
    const grandparent = ObservableFactory.create(grandparentFn);

    // simulate the delay and setting values

    await setVariableDelay(1000);
    child.value = setVariableDelay(2000).then(() => 22);

    await setVariableDelay(2000);
    child.value = setVariableDelay(2000).then(() => 3);

    await setVariableDelay(5000);
    expect(grandparent.value).toBe(5);
  }, 10000); // Increased timeout to 10 seconds
});

describe("Observable subscribe and unsubscribe with AbortSignal", () => {
  it("should subscribe and unsubscribe correctly using AbortSignal", async () => {
    const observable1 = ObservableFactory.create(42);
    const observable2 = ObservableFactory.create("Hello");

    const controller = new AbortController();
    const { signal } = controller;

    let observable1Value: number | null = null;
    let observable2Value: string | null = null;

    observable1.subscribe((current: number) => {
      observable1Value = current;
    }, signal);

    observable2.subscribe((current: string) => {
      observable2Value = current;
    }, signal);

    observable1.value = 43;
    observable2.value = "World";

    controller.abort();

    // Update the values again
    observable1.value = 44;
    observable2.value = "Universe";

    // Delay to allow any potential callbacks to be called

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(observable1Value).toBe(43);
    expect(observable2Value).toBe("World");
  });
});
