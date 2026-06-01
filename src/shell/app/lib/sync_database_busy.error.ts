/** Thrown when the renderer calls list/stats while a full source sync owns the database file. */
export class SyncDatabaseBusyError extends Error {
  constructor() {
    super('Database is busy: source sync in progress')
    this.name = 'SyncDatabaseBusyError'
  }
}
