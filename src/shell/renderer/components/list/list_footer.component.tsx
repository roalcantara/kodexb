import type { RpcKnowledge } from '@shared/rpc'

export type ListFooterProps = {
  footerStatus: string
  isFullDetail: boolean
  detailEntry: RpcKnowledge | null
  closeDetailToList: () => void
}

export function ListFooter({ footerStatus, isFullDetail, detailEntry, closeDetailToList }: ListFooterProps) {
  return (
    <div className="theme-footer">
      <span>{footerStatus}</span>
      <span className="theme-footer-right">
        <span className="theme-footer-keys">
          <span
            className={`theme-footer-keys-prefix${isFullDetail ? '' : ' theme-footer-keys-prefix--inactive'}`}
            aria-hidden={!isFullDetail}
          >
            <button
              type="button"
              className="theme-footer-key-back"
              aria-label="Back to list"
              title="Back to list (Escape)"
              tabIndex={isFullDetail ? 0 : -1}
              onClick={() => {
                if (isFullDetail) closeDetailToList()
              }}
            >
              ⎋
            </button>
            <span className="theme-footer-keys-sep" aria-hidden>
              {' · '}
            </span>
          </span>
          <span>⌘P · ⌘K · ⌘N · ⌘,{detailEntry === null ? '' : ' · ⌘↓ scroll'}</span>
        </span>
      </span>
    </div>
  )
}
