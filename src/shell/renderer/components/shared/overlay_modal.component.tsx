import type { CSSProperties, ReactNode } from 'react'
import { OVERLAY_SHELL_WIDTH_PX } from './primitives/overlay_shell_layout.const'

export type OverlayModalProps = {
  children: ReactNode
  onClose: () => void
  title?: string
  widthPx?: number
  className?: string
  labelledBy?: string
  /** When false, backdrop aligns shell to top (command palette). Default true. */
  centered?: boolean
}

export function OverlayModal({
  children,
  onClose,
  title,
  widthPx = OVERLAY_SHELL_WIDTH_PX,
  className = '',
  labelledBy,
  centered = true
}: OverlayModalProps) {
  const shellStyle = { '--overlay-shell-width': `${widthPx}px` } as CSSProperties
  const backdropClass = centered ? 'cmp-overlay-backdrop cmp-overlay-backdrop--centered' : 'cmp-overlay-backdrop'

  return (
    <div
      className={backdropClass}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-labelledby={labelledBy}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className={`cmp-overlay-shell ${className}`.trimEnd()} style={shellStyle}>
        {title ? <h2 className="cmp-overlay-shell-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  )
}
