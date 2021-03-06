import { extend, isObject } from '../shared';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags, readonly } from './reactive';

const get = createGetter();
const set = createrSetter();
const readonlyGet = createGetter(true);
const shallowReadonly = createGetter(true, true);

export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set<T extends Object>(
    target: T,
    key: PropertyKey,
    value: any,
    receiver?: any
  ) {
    console.warn(`key: ${key.toString()}无法赋值，因为该对象为readonly对象`);
    return true;
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonly,
});

function createGetter(isReadonly = false, shallow = false) {
  return function get<T extends Object>(target: T, key: PropertyKey): T {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly as any;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly as any;
    }

    const result = Reflect.get(target, key);

    if (!isReadonly) {
      //  依赖收集
      track(target, key);
    }

    if (shallow) {
      return result;
    }

    if (isObject(result)) {
      return isReadonly ? readonly(result) : reactive(result);
    }

    return result;
  };
}

function createrSetter() {
  return function set<T extends Object>(
    target: T,
    key: PropertyKey,
    value: any,
    receiver?: any
  ) {
    const result = Reflect.set(target, key, value, receiver);

    //  触发依赖
    trigger(target, key);

    return result;
  };
}
