import type { RpcKnowledge } from '@shared/rpc'

export type ListFooterProps = {
  footerStatus: string
  isFullDetail: boolean
  detailEntry: RpcKnowledge | null
  closeDetailToList: () => void
}

export function ListFooter({ footerStatus, isFullDetail, detailEntry, closeDetailToList }: ListFooterProps) {
  return (
    <div className="kb-pt-footer">
      <span>{footerStatus}</span>
      <span className="kb-pt-footer-right">
        <span className="kb-pt-footer-keys">
          <span
            className={`kb-pt-footer-keysPrefix${isFullDetail ? '' : ' kb-pt-footer-keysPrefix--inactive'}`}
            aria-hidden={!isFullDetail}
          >
            <button
              type="button"
              className="kb-pt-footer-keyBack"
              aria-label="Back to list"
              title="Back to list (Escape)"
              tabIndex={isFullDetail ? 0 : -1}
              onClick={() => {
                if (isFullDetail) closeDetailToList()
              }}
            >
              ⎋
            </button>
            <span className="kb-pt-footer-keysSep" aria-hidden>
              {' · '}
            </span>
          </span>
          <span>⌘P · ⌘K · ⌘N · ⌘,{detailEntry === null ? '' : ' · ⌘↓ scroll'}</span>
        </span>
      </span>
    </div>
  )
}
