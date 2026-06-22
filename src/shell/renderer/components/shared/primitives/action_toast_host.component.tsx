import type { ActionToast } from '../../../hooks/shared/use_action_toast.hook'

export type ActionToastHostProps = {
  toasts: ActionToast[]
  onDismiss: (id: number) => void
}

export function ActionToastHost({ toasts, onDismiss }: ActionToastHostProps) {
  if (toasts.length === 0) return null

  return (
    <div className="cmp-action-toasts">
      {toasts.map(t => (
        <div key={t.id} className={`cmp-action-toast cmp-action-toast--${t.type}`}>
          <span className="cmp-action-toast-msg">{t.message}</span>
          <button type="button" className="cmp-action-toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
