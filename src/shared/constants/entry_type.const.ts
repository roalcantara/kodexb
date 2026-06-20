/** Canonical entry-type discriminants. Lives in shared so both core and the
 *  shared RPC payload schemas can reference one source (core → shared is the
 *  legal dependency direction). */
export const ENTRY_TYPE_VALUES = ['bookmark', 'command', 'cheat', 'task', 'shortcut'] as const
