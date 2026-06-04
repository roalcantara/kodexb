import { afterAll, beforeAll, beforeEach } from 'bun:test'

/** Partial spawn result or `'throw'` to simulate Bun.spawnSync failure. */
export type BunSpawnSyncStubResult =
  | {
      stdout?: Buffer | string
      stderr?: Buffer | string
      exitCode?: number
    }
  | 'throw'

const DEFAULT_STUB: BunSpawnSyncStubResult = {
  stdout: Buffer.alloc(0),
  stderr: Buffer.alloc(0),
  exitCode: 0
}

let _origSpawnSync: typeof Bun.spawnSync
let _installed = false
let _stub: BunSpawnSyncStubResult = DEFAULT_STUB

function materializeStub(stub: BunSpawnSyncStubResult): ReturnType<typeof Bun.spawnSync> {
  if (stub === 'throw') throw new Error('spawn failed')
  const stdout = stub.stdout ?? Buffer.alloc(0)
  const stderr = stub.stderr ?? Buffer.alloc(0)
  return {
    stdout: typeof stdout === 'string' ? Buffer.from(stdout) : stdout,
    stderr: typeof stderr === 'string' ? Buffer.from(stderr) : stderr,
    exitCode: stub.exitCode ?? 0
  } as ReturnType<typeof Bun.spawnSync>
}

function applySpawnSyncDelegate(): void {
  Bun.spawnSync = (() => materializeStub(_stub)) as unknown as typeof Bun.spawnSync
}

export function installBunSpawnSyncMock(initial: BunSpawnSyncStubResult = DEFAULT_STUB): void {
  if (!_installed) {
    _origSpawnSync = Bun.spawnSync
    _installed = true
  }
  _stub = initial
  applySpawnSyncDelegate()
}

export function uninstallBunSpawnSyncMock(): void {
  if (!_installed) return
  Bun.spawnSync = _origSpawnSync
  _installed = false
  _stub = DEFAULT_STUB
}

export function setBunSpawnSyncResult(result: BunSpawnSyncStubResult): void {
  _stub = result
  if (_installed) applySpawnSyncDelegate()
}

export function resetBunSpawnSyncMock(initial: BunSpawnSyncStubResult = DEFAULT_STUB): void {
  _stub = initial
  if (_installed) applySpawnSyncDelegate()
}

/** Installs in `beforeAll`, resets stub in `beforeEach`, restores in `afterAll`. */
export function setupBunSpawnSyncMock(initial: BunSpawnSyncStubResult = DEFAULT_STUB): void {
  beforeAll(() => installBunSpawnSyncMock(initial))
  beforeEach(() => resetBunSpawnSyncMock(initial))
  afterAll(() => uninstallBunSpawnSyncMock())
}
