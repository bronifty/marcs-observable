# marcs-observable

marcs-observable is a TypeScript library that provides a simple and efficient way to create and manage observables. An observable is a stream of values or events that other values can react to. This library allows you to create observables, subscribe to them, and publish changes to them. It also supports computed observables, which are observables that depend on other observables.

### Installation

```shell
npm install marcs-observable
```

### Usage

#### Creating an Observable

```ts
import { ObservableFactory } from "marcs-observable";
const observable = ObservableFactory.create(42);
```

#### Subscribing to an Observable

```ts
let trackedVal: number | null = null;
observable.subscribe((current: number) => {
  trackedVal = current;
});
```

#### Publishing Changes to an Observable

```ts
observable.value = 43;
```

#### Creating a Computed Observable

```ts
const childObservable = ObservableFactory.create(5);
const func = () => childObservable.value * 2;
const parentObservable = ObservableFactory.create(func);
```

#### Handling Asynchronous Computations

```ts
const func = async () => {
  await Observable.delay(100);
  return 42;
};
const observable = ObservableFactory.create(func);
```

### API

#### ObservableFactory.create(initialValue: any, ...args: any[]): IObservable

Creates a new observable. If the initial value is a function, the observable becomes a computed observable. Any extra arguments will be passed to the function.

#### observable.subscribe(handler: (current: any, previous: any) => void): () => void

Subscribes to the observable. The handler function is called whenever the observable's value changes. The function returns an unsubscribe function.

#### observable.publish(): void

Publishes changes to the observable. This is usually not called directly, but is used internally when the observable's value changes.

#### observable.compute(): void

Recomputes the value of a computed observable. This is usually not called directly, but is used internally when a dependency of the computed observable changes.

#### observable.value: any

Gets or sets the value of the observable. If the observable is a computed observable, setting the value will not affect the computed function.

#### Observable.delay(ms: number)

Returns a promise that resolves after a delay of ms milliseconds. This is used for handling asynchronous computations in computed observables.

### Testing

The library includes a comprehensive set of tests to ensure its functionality. You can run these tests using Deno:

```ts
deno test
```

### License

marcs-observable is licensed under the MIT License.
