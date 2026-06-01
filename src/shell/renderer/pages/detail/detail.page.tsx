import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useEffect, useState } from 'react'

import { DetailPageView } from '../../components/detail/detail_view.component'
import { useDetailEntryLoader } from '../../hooks/detail/use_detail_entry_loader.hook'
import { getConfig } from '../../rpc/client'
import { DetailShortcutBody, navigateToChordDetail } from './detail_shortcut_body.component'

export type DetailPageProps = {
  entryId: number
  allEntries: RpcKnowledge[]
  onClose: () => void
  onSelectEntry: (id: number) => void
  loadEntry?: (id: number) => Promise<RpcKnowledge | null>
}

function defaultLoadEntry(id: number): Promise<RpcKnowledge | null> {
  return import('../../rpc/client').then(m => m.getEntry(id))
}

function defaultOpenExternal(url: string): Promise<void> {
  return import('../../rpc/client').then(m => m.openExternal(url))
}

export function DetailPage({
  entryId,
  allEntries,
  onClose,
  onSelectEntry,
  loadEntry = defaultLoadEntry
}: DetailPageProps) {
  const [displayAdvisories, setDisplayAdvisories] = useState(false)
  const { entry, loading, body, setBody } = useDetailEntryLoader({ entryId, loadEntry })

  useEffect(() => {
    fireAndForget(
      getConfig().then(cfg => {
        setDisplayAdvisories(cfg.display.advisories ?? false)
      })
    )
  }, [])

  const handleBack = () => {
    setBody(prev => ({
      mode: 'keymap',
      restoreBindingId: prev.mode === 'chord' ? prev.restoreBindingId : null
    }))
  }

  const renderBodyContent = () => {
    if (!entry || loading) return null
    return (
      <DetailShortcutBody
        entry={entry}
        entryId={entryId}
        body={body}
        displayAdvisories={displayAdvisories}
        onChordDetailNavigate={(chordHash, bindingId) => navigateToChordDetail(chordHash, bindingId, setBody)}
        onBack={handleBack}
      />
    )
  }

  return (
    <DetailPageView
      entry={entry}
      loading={loading}
      allEntries={allEntries}
      onClose={onClose}
      onSelectEntry={onSelectEntry}
      onOpenExternal={url => fireAndForget(Promise.resolve(defaultOpenExternal(url)))}
      bodyContent={renderBodyContent()}
    />
  )
}
