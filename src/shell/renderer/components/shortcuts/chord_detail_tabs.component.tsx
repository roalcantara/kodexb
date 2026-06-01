import type { BindingRef } from '@shared/rpc'
import type { ChordDetailTab, UseChordDetailResult } from '../../hooks/shortcuts/use_chord_detail.hook'

export type ChordDetailTabsProps = {
  state: Pick<UseChordDetailResult, 'tabs' | 'activeTab' | 'setActiveTab'>
  bindingsForHash: BindingRef[]
}

export function ChordDetailTabs({ state, bindingsForHash }: ChordDetailTabsProps) {
  return (
    <div className="cmp-chord-detail__tabs" role="tablist">
      {state.tabs.map((tab: ChordDetailTab) => {
        const isGlobals = tab.type === 'globals'
        const appLabel = isGlobals ? 'globals' : tab.app
        const isActive =
          tab.type === state.activeTab.type &&
          (isGlobals ? true : appLabel === (state.activeTab.type === 'app' ? state.activeTab.app : ''))
        return (
          <button
            key={appLabel}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`cmp-chord-detail__tab${isActive ? ' cmp-chord-detail__tab--active' : ''}`}
            onClick={() => state.setActiveTab(tab)}
          >
            {appLabel}
            <span className="cmp-chord-detail__tab-count">
              {isGlobals
                ? bindingsForHash.filter(binding => binding.scope === 'global').length
                : bindingsForHash.filter(binding => binding.app === appLabel).length}
            </span>
          </button>
        )
      })}
    </div>
  )
}
