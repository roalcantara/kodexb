import type { ActionToast } from '../../hooks/shared/use_action_toast.hook'

export type ActionToastHostProps = {
  toasts: ActionToast[]
  onDismiss: (id: number) => void
}

export function ActionToastHost({ toasts, onDismiss }: ActionToastHostProps) {
  if (toasts.length === 0) return null

  return (
    <div className="kb-action-toasts">
      {toasts.map(t => (
        <div key={t.id} className={`kb-action-toast kb-action-toast--${t.type}`}>
          <span className="kb-action-toast-msg">{t.message}</span>
          <button type="button" className="kb-action-toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
