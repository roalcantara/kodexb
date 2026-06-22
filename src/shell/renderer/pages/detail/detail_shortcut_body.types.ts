import type { RpcKnowledge } from '@shared/rpc'

export type ShortcutDetailBody =
  | { mode: 'keymap'; restoreBindingId: string | null }
  | { mode: 'chord'; chordHash: string; restoreBindingId: string }

export type DetailShortcutBodyProps = {
  entry: RpcKnowledge
  entryId: number
  body: ShortcutDetailBody
  displayAdvisories: boolean
  onChordDetailNavigate: (chordHash: string, bindingId: string) => void
  onBack: () => void
}
