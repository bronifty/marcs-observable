import { assertEquals } from "https://deno.land/std@0.199.0/testing/asserts.ts";
import { deferred } from "https://deno.land/std@0.199.0/async/deferred.ts";
import { ObservableFactory, Observable } from "./index.ts";

// Publish changes to subscriber functions when values change.
// Modifying arrays and objects will not publish, but replacing them will.
// Passing a function caches the result as the value. Any extra arguments will be passed to the function.
// Any observables called within the function will be subscribed to, and updates to those observables will recompute the value.
// Child observables must be called, mere references are ignored.
// If the function returns a Promise, the value is assigned async after resolution.

// Requirement 1
Deno.test("Observable publish and subscribe", () => {
  // observable is effectively a signal or a stream of values/events that other values can react to
  const observable = ObservableFactory.create(42);
  // trackedVal is a variable that will be updated when the observable is updated
  let trackedVal: number | null = null;
  observable.subscribe((current: number) => {
    trackedVal = current;
  });
  observable.value = 42;
  assertEquals(trackedVal, 42);
  observable.value = 43;
  assertEquals(trackedVal, 43);
});

// Requirement 2
Deno.test("Observable publish on array replacement, not modification", () => {
  const observable = ObservableFactory.create([]);
  let count = 0;
  // any published change will inc count
  observable.subscribe(() => count++);
  const arr = [1, 2];
  observable.value = arr; // count++
  arr.push(3); // no count++ because arr is not being replaced
  observable.value = [1, 2, 3]; // count++
  assertEquals(count, 2);
  arr.push(4); // no count++ because arr is not being replaced
  assertEquals(count, 2);
  observable.value = [1, 2, 3, 4]; // count++
  assertEquals(count, 3);
});

// Requirement 3
Deno.test("Observable sets value with a function and arguments", () => {
  const func = (a: number, b: number) => a + b;
  const observable = ObservableFactory.create(func, 3, 4);
  assertEquals(observable.value, 7);
});

// Requirement 3.5
Deno.test(
  "Observable sets value with a function and variable number of arguments",
  () => {
    const func = (...args: number[]) =>
      args.reduce((acc, value) => acc + value, 0);
    const observable = ObservableFactory.create(func, 3, 4, 5, 6); // You can pass any number of arguments here
    assertEquals(observable.value, 18); // The sum of 3, 4, 5, and 6
  }
);

// Requirements 4 & 5
Deno.test("Observable recomputes value when child observables change", () => {
  const childObservable = ObservableFactory.create(5);
  const func = () => childObservable.value * 2;
  const parentObservable = ObservableFactory.create(func);
  assertEquals(parentObservable.value, 10);
  childObservable.value = 10;
  assertEquals(parentObservable.value, 20);
});

// Requirement 6
Deno.test("ObservableValue compute with async function", async () => {
  // Save the original delay method
  const originalDelay = Observable.delay;
  // Override with a mocked version that matches the expected type
  Observable.delay = (ms: number) => {
    return {
      promise: Promise.resolve(),
      clear: () => {},
    };
  };
  const { promise, clear } = Observable.delay(100);
  await promise;
  clear();
  const func = async () => {
    await Observable.delay(100); // This will now resolve immediately
    return 42;
  };
  const observable = ObservableFactory.create(func);
  await Observable.delay(100); // This will also resolve immediately
  // Manually trigger the computation without relying on setTimeout
  const computePromise = (observable as any).compute(); // Casting to any to bypass type checking and get the promise
  await computePromise; // Wait for the computation to complete
  assertEquals(observable.value, 42);
  // Restore the original delay method
  Observable.delay = originalDelay;
});

// Requirement 7 reassign computed observable value without affecting its internal computed dependencies calculation (setting the value won't override the computed function)
Deno.test(
  "Overwrite computed observable value without changing computed function",
  () => {
    const logChanges = (current: any, previous: any) => {
      console.log(`Changed to ${current} from ${previous} `);
    };
    // Initialize observables
    const i = ObservableFactory.create(1);
    const z = ObservableFactory.create(10);
    const func = () => {
      return i.value;
    };
    const computed = ObservableFactory.create(func);
    computed.subscribe(logChanges);
    console.log(`computed.value: ${computed.value}`); // computed.value: 1
    assertEquals(computed.value, 1);
    i.value = 2; // logChanges(2,1)
    assertEquals(computed.value, 2);
    // Overwrite value directly without affecting computed function
    const newFunc = () => {
      return z.value;
    };
    computed.value = newFunc();
    assertEquals(computed.value, 10);
    z.value = 2; // no change
    assertEquals(computed.value, 10);
    i.value = 2; // logChanges(2,10)
    assertEquals(computed.value, 2);
  }
);
