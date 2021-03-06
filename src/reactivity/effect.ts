import { extend } from '../shared';
import { EffectOptions, Runner } from './types';

export class ReactiveEffect {
  private _fn: Function;
  private isActive = true;

  public deps: Set<ReactiveEffect>[] = [];

  public onStop?: () => void;
  constructor(fn: Function, public scheduler?: () => void) {
    this._fn = fn;
  }

  run() {
    if (!this.isActive) {
      return this._fn();
    }

    activeEffect = this;
    shouldTrack = true;

    const result = this._fn();

    shouldTrack = false;

    return result;
  }

  stop() {
    if (this.isActive) {
      cleanupEffect(this);
      this.onStop?.();
      this.isActive = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

let activeEffect: ReactiveEffect;
let shouldTrack: boolean;

export function effect(fn: Function, options?: EffectOptions) {
  const _effect = new ReactiveEffect(fn);

  extend(_effect, options);

  _effect.run();

  const runner = _effect.run.bind(_effect);
  (runner as Runner).effect = _effect;

  return runner as Runner;
}

const targetMap = new Map<Object, Map<PropertyKey, Set<ReactiveEffect>>>();
export function track<T extends Object>(target: T, key: PropertyKey) {
  if (!isTracking()) return;

  let depsMap = targetMap.get(target);

  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);

  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  if (dep.has(activeEffect)) return;

  trackEffect(dep);
}

export function trackEffect(dep: Set<any>) {
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function isTracking() {
  return shouldTrack && !activeEffect !== undefined;
}

export function trigger<T extends Object>(target: T, key: PropertyKey) {
  const depsMap = targetMap.get(target);

  if (!depsMap) return;

  const dep = depsMap.get(key);

  if (!dep) return;

  triggerEffect(dep);
}

export function triggerEffect(dep: Set<any>) {
  for (const effect of dep) {
    if (effect?.scheduler) {
      effect.scheduler();
    } else {
      effect?.run();
    }
  }
}

export function stop(runner: Runner) {
  runner.effect.stop();
}
