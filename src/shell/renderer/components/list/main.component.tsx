import { useEffect } from 'react'
import { type ListMainProps, useListMain } from '../../hooks/list/use_list_main.hook'
import { ListMainShell } from './main_shell.component'
import { ListOverlayHosts } from './overlay_hosts.component'

const MUTATION_ERROR_DURATION_MS = 5000

export const EMPTY_TAG_COUNTS: Readonly<Record<string, number>> = Object.freeze({})

export type { ListMainProps }

function MutationErrorBanner({ error, onClear }: { error: string | null; onClear: () => void }) {
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(onClear, MUTATION_ERROR_DURATION_MS)
    return () => clearTimeout(timer)
  }, [error, onClear])

  if (!error) return null

  return (
    <div className="cmp-list-mutation-error" role="alert">
      {error}
    </div>
  )
}

export function ListMain(props: ListMainProps) {
  const vm = useListMain(props)
  const mutationBanner = (
    <MutationErrorBanner error={props.listActions.mutationError} onClear={props.listActions.clearMutationError} />
  )

  return (
    <>
      <ListMainShell props={props} vm={vm} mutationBanner={mutationBanner} />
      <ListOverlayHosts
        listData={props.listData}
        listOverlays={props.listOverlays}
        listActions={props.listActions}
        showSettings={props.showSettings}
        setShowSettings={props.setShowSettings}
        focusMainSearch={vm.handlers.focusMainSearch}
      />
    </>
  )
}
