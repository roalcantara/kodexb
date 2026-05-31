import {
  type ListFooterActionContext,
  resolveListFooterPrimary,
  resolveListFooterSecondary,
  runListFooterPrimary,
  runListFooterSecondary
} from '../../utils/list/list_footer_primary.util'

function FooterKbdChip({ children }: { children: string }) {
  return <kbd className="cmp-kbd">{children}</kbd>
}

export type ListFooterProps = ListFooterActionContext & {
  footerStatus: string
  isFullDetail: boolean
  closeDetailToList: () => void
  onOpenPalette: () => void
}

export function ListFooter({
  footerStatus,
  isFullDetail,
  closeDetailToList,
  onOpenPalette,
  ...actionCtx
}: ListFooterProps) {
  const primaryLabel = resolveListFooterPrimary(actionCtx).action?.label
  const secondaryLabel = resolveListFooterSecondary(actionCtx).action?.label

  return (
    <div className="cmp-footer">
      <span>{footerStatus}</span>
      <div className="cmp-footer-right">
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
          <span className="cmp-footer-actions-sep cmp-footer-keys-sep" aria-hidden>
            {' '}
          </span>
        </span>
        <div className="cmp-footer-actions-raycast">
          {primaryLabel ? (
            <>
              <button type="button" className="cmp-footer-primary" onClick={() => runListFooterPrimary(actionCtx)}>
                {primaryLabel}
                <span className="cmp-footer-primary-hint" aria-hidden>
                  ↵
                </span>
              </button>
              <span className="cmp-footer-actions-sep" aria-hidden />
            </>
          ) : null}
          {secondaryLabel ? (
            <>
              <button type="button" className="cmp-footer-secondary" onClick={() => runListFooterSecondary(actionCtx)}>
                {secondaryLabel}
                <span className="cmp-footer-secondary-hint" aria-hidden>
                  ⌘↵
                </span>
              </button>
              <span className="cmp-footer-actions-sep" aria-hidden />
            </>
          ) : null}
          <button type="button" className="cmp-footer-actions-label" onClick={onOpenPalette}>
            Actions <FooterKbdChip>⌘</FooterKbdChip>
            <FooterKbdChip>K</FooterKbdChip>
          </button>
        </div>
      </div>
    </div>
  )
}
