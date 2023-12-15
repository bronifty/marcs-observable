import { assertEquals } from "https://deno.land/std@0.199.0/testing/asserts.ts";
import { deferred } from "https://deno.land/std@0.199.0/async/deferred.ts";
import { ObservableFactory, Observable } from "./index.ts";
// import { ObservableFactory, Observable } from "./observable.ts";

// Publish changes to subscriber functions when values change.
// Modifying arrays and objects will not publish, but replacing them will.
// Passing a function caches the result as the value. Any extra arguments will be passed to the function.
// Any observables called within the function will be subscribed to, and updates to those observables will recompute the value.
// Child observables must be called, mere references are ignored.
// If the function returns a Promise, the value is assigned async after resolution.

// Requirement 1
Deno.test("Observable publish and subscribe", () => {
  const observable = ObservableFactory.create(41);
  let trackedVal: number | null = null;
  observable.subscribe((current: number) => {
    console.log("Subscription callback called with value:", current); // Add this log
    trackedVal = current;
  });
  console.log("Setting value to 42"); // Add this log
  observable.value = 42;
  assertEquals(trackedVal, 42);
  console.log("Setting value to 43"); // Add this log
  observable.value = 43;
  assertEquals(trackedVal, 43);
});

// // Requirement 2
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

// // Requirement 3
Deno.test("Observable sets value with a function and arguments", () => {
  const func = (a: number, b: number) => a + b;
  const observable = ObservableFactory.create(func, 3, 4);
  assertEquals(observable.value, 7);
});

// // Requirement 3.5
Deno.test(
  "Observable sets value with a function and variable number of arguments",
  () => {
    const func = (...args: number[]) =>
      args.reduce((acc, value) => acc + value, 0);
    const observable = ObservableFactory.create(func, 3, 4, 5, 6); // You can pass any number of arguments here
    assertEquals(observable.value, 18); // The sum of 3, 4, 5, and 6
  }
);

// // Requirements 4 & 5
Deno.test("Observable recomputes value when child observables change", () => {
  const childObservable = ObservableFactory.create(5);
  const func = () => childObservable.value * 2;
  const parentObservable = ObservableFactory.create(func);
  assertEquals(parentObservable.value, 10);
  childObservable.value = 10;
  assertEquals(parentObservable.value, 20);
});

// // Requirement 6
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

// // Requirement 7 reassign computed observable value without affecting its internal computed dependencies calculation (setting the value won't override the computed function)
Deno.test(
  "Overwrite computed observable value without changing computed function",
  () => {
    const logChanges = (current: any, previous: any) => {
      console.log(`Changed to ${current} from ${previous} `);
    };
    // Initialize observables
    const i = ObservableFactory.create(1);
    const j = ObservableFactory.create(10);
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
      return j.value;
    };
    computed.value = newFunc();
    assertEquals(computed.value, 10);
    j.value = 2; // no change
    assertEquals(computed.value, 10);
    i.value = 3; // logChanges(2,10)
    assertEquals(computed.value, 3);
  }
);

Deno.test("cancel stale requests", async () => {
  // create a child promise with request delay 100ms
  function childFnPromise() {
    return Observable.delay(100).promise.then(() => 1);
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
  // subscribe the console to the observables' updates
  child.subscribe((value: any) => {
    console.log(
      `child update; current value: ${JSON.stringify(value, null, 2)}`
    );
  });
  parent.subscribe((value: any) => {
    console.log(
      `parent update; current value: ${JSON.stringify(value, null, 2)}`
    );
  });
  grandparent.subscribe((value: any) => {
    console.log(
      `grandparent update; current value: ${JSON.stringify(value, null, 2)}`
    );
  });

  // log the current values of the observables after a delay of 200ms to make sure the child promise is resolved and the parent observables have been initialized
  Observable.delay(200).promise.then(() => {
    console.log(
      `child.value after creation: ${JSON.stringify(child.value, null, 2)}`
    );
  });
  Observable.delay(200).promise.then(() => {
    console.log(
      `parent.value after creation: ${JSON.stringify(parent.value, null, 2)}`
    );
  });
  Observable.delay(200).promise.then(() => {
    console.log(
      `grandparent.value after creation: ${JSON.stringify(
        grandparent.value,
        null,
        2
      )}`
    );
  });
  // test a stale request that begins after a delay of 1000ms to allow for the creation of the observables, which resolve after some time; this first generation request (Promise) will begin first and end last (it will be stale)
  Observable.delay(1000).promise.then(() => {
    console.log(
      `setting child.value = 22 beginning in 1000ms and ending in 3000ms`
    );
    child.value = Observable.delay(3000).promise.then(() => 22);
  });
  // this second Promise (request) will begin last and end first (it will invalidate the Promise with which it was running concurrently)
  Observable.delay(2000).promise.then(() => {
    console.log(
      `setting child.value = 3 beginning in 2000ms and ending in 10ms`
    );
    child.value = Observable.delay(10).promise.then(() => 3);
  });
  // delay the test from completing for the duration
  const { promise } = Observable.delay(5000); // Adjust the delay time as needed
  await promise;
  assertEquals(grandparent.value, 5);
});

Deno.test("Observable subscribe and unsubscribe with AbortSignal", async () => {
  const observable1 = ObservableFactory.create(42);
  const observable2 = ObservableFactory.create("Hello");

  const controller = new AbortController();
  const { signal } = controller;

  let observable1Value: number | null = null;
  let observable2Value: string | null = null;

  const unsubscribe1 = observable1.subscribe((current: number) => {
    observable1Value = current;
  }, signal);

  const unsubscribe2 = observable2.subscribe((current: string) => {
    observable2Value = current;
  }, signal);

  observable1.value = 43;
  observable2.value = "World";

  // Check that the values have been updated
  assertEquals(observable1Value, 43);
  assertEquals(observable2Value, "World");

  controller.abort();

  // Update the values again
  observable1.value = 44;
  observable2.value = "Universe";

  // Delay to allow any potential callbacks to be called
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Check that the values have not been updated
  assertEquals(observable1Value, 43);
  assertEquals(observable2Value, "World");
});
