import type { BuildOptions } from 'fishery'
import { type FactoryBuildOpts, isFactoryOpts, type WrappedFactoryOpts } from './testing.types'

/**
 * Structural minimum for Fishery `Factory`.
 * `build` uses `any` so concrete `Factory<T>` stays assignable under
 * strictFunctionTypes (contravariant parameters).
 */
type FactoryLike = {
  build: (
    // biome-ignore lint/suspicious/noExplicitAny: Fishery per-factory partial params
    params?: any,
    // biome-ignore lint/suspicious/noExplicitAny: Fishery BuildOptions
    options?: any
    // biome-ignore lint/suspicious/noExplicitAny: Fishery built row type
  ) => any
}

function paramsFor<R>(
  w: Pick<WrappedFactoryOpts<R, unknown>, 'associations' | 'transient'>
): BuildOptions<R, unknown> | undefined {
  const out: BuildOptions<R, unknown> = {}
  if (w.associations !== undefined) out.associations = w.associations
  if (w.transient !== undefined) out.transient = w.transient
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Returns a typed `factoryFor(name, opts?)` for a Fishery registry.
 * Use `as const` on the registry so factory names and result types infer correctly.
 * @example
 * const factories = {
 *   user: new UserFactory(),
 *   post: new PostFactory()
 * } as const;
 * const factoryFor = createFactoryFor(factories);
 * const user = factoryFor('user', { overrides: { name: 'Alice' } });
 */
export function createFactoryFor<const F extends Record<string, FactoryLike>>(factories: F) {
  type FactoryNames = keyof F
  type FactoryBuildFunction<T extends FactoryNames> = F[T]['build']
  type FactoryResults = { [K in FactoryNames]: ReturnType<FactoryBuildFunction<K>> }
  type Result<T extends FactoryNames> = FactoryResults[T]
  type ParamsMap = { [K in FactoryNames]: Partial<Parameters<FactoryBuildFunction<K>>[0]> }
  type FactoryOptions<T extends FactoryNames> = FactoryBuildOpts<Result<T>, ParamsMap[T]>
  type FactoryParams<T extends FactoryNames> = Parameters<FactoryBuildFunction<T>>[0]

  function factoryFor<T extends FactoryNames>(name: T, opts?: FactoryOptions<T>): FactoryResults[T] {
    const factory = factories[name] as F[T]
    if (opts === undefined) {
      return factory.build() as FactoryResults[T]
    }
    if (isFactoryOpts(opts)) {
      const w = opts as WrappedFactoryOpts<Result<T>, ParamsMap[T]>
      const second = paramsFor<Result<T>>(w)
      let built = factory.build(w.overrides as FactoryParams<T>, second) as Result<T>
      if (w.afterBuild) built = w.afterBuild(built) as Result<T>
      return built as FactoryResults[T]
    }
    return factory.build(opts as FactoryParams<T>) as FactoryResults[T]
  }

  return factoryFor
}
