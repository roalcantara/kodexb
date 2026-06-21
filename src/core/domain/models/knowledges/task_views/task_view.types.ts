/**
 * Canonical task-view vocabulary (ARCH-1 AC1 / P2-3).
 *
 * Defined here so `src/core` no longer reaches into the RPC schema module
 * for a domain type. The RPC schema re-exports this for backward
 * compatibility; the TypeBox schema in `payload_schemas.ts` derives from
 * `TASK_VIEW_ORDER`.
 */
export type TaskView = 'actionable' | 'today' | 'overdue' | 'this_week' | 'all_pending' | 'all_doing'
