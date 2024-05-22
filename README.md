# marcs-observable

bronifty@gmail.com

### Description

This package is a typescript replica of @marc1's observablish-values package used on the frontend masters website for the media player.

### Usage

**Install Package**

```sh
pnpm add @bronifty/marcs-observable
```

**Code Example**

```tsx
import React from "react";
// import { Observable, ObservableFactory } from "marcs-observable";
import marcsObservable from "@bronifty/marcs-observable";

// creating observables outside of the component in order to preserve state when component re-renders
// this could also be done in a store and inported
const child = marcsObservable(() => 1);
const parent = marcsObservable(() => child.value + 1);

const App = () => {
  const [_, setChildValue] = React.useState(child.value);

  // useEffect to trigger a re-render when the child observable changes
  React.useEffect(() => {
    const childSubscription = child.subscribe((value) => setChildValue(value));
    return () => {
      childSubscription();
    };
  }, []);

  return (
    <>
      <section>
        <h1>test 3 - marcs-observable</h1>
        <p>child.value - {child.value}</p>
        <p>parent.value - {parent.value}</p>
        <button onClick={() => (child.value += 1)}>child.value += 1</button>
      </section>
    </>
  );
};

export default App;
```
