export class Observable {
  _value;
  _previousValue;
  _subscribers = [];
  _valueFn = null;
  _valueFnArgs = [];
  static _computeActive = null;
  _dependencyArray = [];
  _lastPromiseId = 0;
  _isComputing = false;
  _promiseQueue = [];
  _generationCounter = 0;
  // private _pendingUpdates: Function[] = [];
  // private _isProcessingUpdates: boolean = false;
  // because _computeActive is static and the parent observable is assigned to it during compute of the parent observable's _valueFn, which returns the child's value via get accessor, where we add the child (in its get accessor during the compute cycle of the parent observable) to the _dependencyArray of the parent observable, we must make _dependencyArray non-private aka public so that it can be accessed by the child via the static -aka global- property _computeActive, to which the parent observable is assigned
  // so what that looks like is:
  // 1. parent.compute() assigns parent observable to the global aka "static" member "_computeActive"
  // 2. parent.compute() calls parent._valueFn(...parent._valueFnArgs)
  // 3. parent._valueFn contains child.value, which is called as get value() or the get accessor of the child. Now we have pushed the child observable's get accessor method on top of the call stack, right above the parent's compute method
  // 4. before we access the child's value to return it to the parent's compute function (the call site or calling code), we check to see if the child observable itself is a dependency on the parent's own _dependencyArray, which is accessed as a property of the global aka "static" member of the observable class "_computeActive", to which the parent is assigned (the parent observable is equal to "_computeActive" and its property "_dependencyArray" is accessed via _computeActive._dependencyArray; the way to signify accessing the global or "static" property, which is assigned to an object, and its property is by referencing the name of the observable class as a prefix like so: Observable._computeActive._dependencyArray).
  // 5. If the child is not already on the static Observable._computeActive._dependencyArray to which the parent is assigned (in other words, the parent's dependency array, which is accessed by the child on the call stack via making it a global or static), we push it on there.
  // 6. child.value is returned to the call site or calling code (parent.compute()); if it's a Promise, handle that.
  // 7. loop over the parent's _dependencyArray and subscribe each child to teh compute method of the parent (bindComputedObservable function)
  // 8. nullify the _dependencyArray
  constructor(init, ...args){
    if (typeof init === "function") {
      this._valueFn = init;
      this._valueFnArgs = args;
      this.compute();
    } else {
      this._value = init;
    }
  }
  get value() {
    if (Observable._computeActive && Observable._computeActive !== this && !Observable._computeActive._dependencyArray.includes(this)) {
      Observable._computeActive._dependencyArray.push(this);
    }
    return this._value;
  }
  set value(newVal) {
    this._previousValue = this._value;
    if (newVal instanceof Promise) {
      this._generationCounter += 1;
      const currentGeneration = this._generationCounter;
      const promiseObject = {
        promise: newVal,
        clear: ()=>{}
      };
      this._promiseQueue.push([
        currentGeneration,
        promiseObject
      ]);
      promiseObject.promise.then((resolvedVal)=>{
        if (currentGeneration === this._generationCounter) {
          // This is the latest promise, resolve it
          this._value = resolvedVal;
          // loop over the promise queue and cancel each; observable constructor should also take an optional cancel function but default to the fetch abort controller
          this.publish();
        } else {
        // This promise is stale, do nothing
        }
        this._promiseQueue = this._promiseQueue.filter(([generation, _])=>generation !== currentGeneration);
      }).catch((error)=>{
        console.error("Error resolving value:", error);
        this._promiseQueue = this._promiseQueue.filter(([generation, _])=>generation !== currentGeneration);
      });
    } else {
      this._value = newVal;
      this.publish();
    }
  }
  subscribe = (handler, signal)=>{
    if (signal) {
      const abortHandler = ()=>{
        unsubscribe();
        signal.removeEventListener("abort", abortHandler);
      };
      signal.addEventListener("abort", abortHandler, {
        once: true
      });
    }
    const unsubscribe = ()=>{
      const index = this._subscribers.indexOf(handler);
      if (index > -1) {
        this._subscribers.splice(index, 1);
      }
    };
    if (!this._subscribers.includes(handler)) {
      this._subscribers.push(handler);
    }
    return unsubscribe;
  };
  publish = ()=>{
    for (const handler of this._subscribers){
      handler(this._value, this._previousValue);
    }
  };
  computeHandler = ()=>{
    return this.compute();
  };
  compute = ()=>{
    if (this._isComputing) {
      // A computation is already in progress, queue or discard this computation
      return;
    }
    this._isComputing = true;
    Observable._computeActive = this;
    const computedValue = this._valueFn ? this._valueFn(...this._valueFnArgs) : null;
    this._lastPromiseId += 1;
    const currentPromiseId = this._lastPromiseId;
    const handleComputedValue = (resolvedValue)=>{
      if (currentPromiseId !== this._lastPromiseId) return; // Ignore stale promises
      Observable._computeActive = null;
      this._dependencyArray.forEach((dependency)=>{
        this.bindComputedObservable(dependency);
      });
      this._dependencyArray = [];
      this.value = resolvedValue;
      this._isComputing = false;
    };
    if (computedValue instanceof Promise) {
      computedValue.then(handleComputedValue);
    } else {
      handleComputedValue(computedValue);
    }
  };
  bindComputedObservable = (childObservable)=>{
    childObservable.subscribe(this.computeHandler);
  };
  push = (item)=>{
    if (Array.isArray(this._value)) {
      this._value.push(item);
    } else {
      throw new Error("Push can only be called on an observable array.");
    }
  };
  static delay(ms) {
    let timeoutId;
    const promise = new Promise((resolve)=>{
      timeoutId = setTimeout(resolve, ms);
    });
    const clear = ()=>clearTimeout(timeoutId);
    return {
      promise,
      clear
    };
  }
}
export class ObservableFactory {
  static create(initialValue, ...args) {
    return new Observable(initialValue, ...args);
  }
}
/** marcsObservable is the default export */ export default function marcsObservable(initialValue, ...args) {
  return new Observable(initialValue, ...args);
}
//# sourceMappingURL=main.js.map