import type { ActionToast } from '../../hooks/shared/use_action_toast.hook'

export type ActionToastHostProps = {
  toasts: ActionToast[]
  onDismiss: (id: number) => void
}

export function ActionToastHost({ toasts, onDismiss }: ActionToastHostProps) {
  if (toasts.length === 0) return null

  return (
    <div className="theme-action-toasts">
      {toasts.map(t => (
        <div key={t.id} className={`theme-action-toast theme-action-toast--${t.type}`}>
          <span className="theme-action-toast-msg">{t.message}</span>
          <button
            type="button"
            className="theme-action-toast-close"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
