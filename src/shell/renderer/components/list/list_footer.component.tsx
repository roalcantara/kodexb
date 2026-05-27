import type { RpcKnowledge } from '@shared/rpc'

export type ListFooterProps = {
  footerStatus: string
  isFullDetail: boolean
  detailEntry: RpcKnowledge | null
  closeDetailToList: () => void
}

const DEFAULT_SHORTCUTS: [string, string][] = [
  ['⌘', 'P'],
  ['⌘', 'K'],
  ['⌘', 'N'],
  ['⌘', ',']
]

function FooterShortcut({ keys }: { keys: [string, string] }) {
  return (
    <>
      <kbd className="cmp-kbd">{keys[0]}</kbd>
      <kbd className="cmp-kbd">{keys[1]}</kbd>
    </>
  )
}

function FooterShortcutGroup({ shortcuts }: { shortcuts: [string, string][] }) {
  return (
    <span className="cmp-footer-shortcuts">
      {shortcuts.map((keys, index) => (
        <span key={`${keys[0]}-${keys[1]}`} className="cmp-footer-shortcut-group">
          {index > 0 ? (
            <span className="cmp-footer-keys-sep" aria-hidden>
              {' · '}
            </span>
          ) : null}
          <FooterShortcut keys={keys} />
        </span>
      ))}
    </span>
  )
}

export function ListFooter({ footerStatus, isFullDetail, detailEntry, closeDetailToList }: ListFooterProps) {
  const shortcuts = detailEntry === null ? DEFAULT_SHORTCUTS : [...DEFAULT_SHORTCUTS, ['⌘', '↓'] as [string, string]]

  return (
    <div className="cmp-footer">
      <span>{footerStatus}</span>
      <span className="cmp-footer-right">
        <span className="cmp-footer-keys">
          <span
            className={`cmp-footer-keys-prefix${isFullDetail ? '' : ' cmp-footer-keys-prefix--inactive'}`}
            aria-hidden={!isFullDetail}
          >
            <button
              type="button"
              className="cmp-footer-key-back"
              aria-label="Back to list"
              title="Back to list (Escape)"
              tabIndex={isFullDetail ? 0 : -1}
              onClick={() => {
                if (isFullDetail) closeDetailToList()
              }}
            >
              ⎋
            </button>
            <span className="cmp-footer-keys-sep" aria-hidden>
              {' · '}
            </span>
          </span>
          <FooterShortcutGroup shortcuts={shortcuts} />
        </span>
      </span>
    </div>
  )
}
