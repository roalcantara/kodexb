import type { ChordDetailRow, UseChordDetailResult } from '../../hooks/shortcuts/use_chord_detail.hook'

export type ChordDetailRowListProps = {
  state: Pick<UseChordDetailResult, 'activeTab' | 'rows' | 'selectedRowIndex' | 'setSelectedRowIndex'>
  displayAdvisories: boolean
}

export function ChordDetailRowList({ state, displayAdvisories }: ChordDetailRowListProps) {
  return (
    <div className="cmp-chord-detail__rows" role="listbox">
      {state.rows.length === 0 ? (
        <div className="cmp-chord-detail__empty">
          {state.activeTab.type === 'globals' ? (
            <>— no global bindings for this chord</>
          ) : (
            <>— no bindings in {state.activeTab.type === 'app' ? state.activeTab.app : ''}</>
          )}
        </div>
      ) : (
        state.rows.map((row: ChordDetailRow, index) => {
          const isSelected = index === state.selectedRowIndex
          const hasHard = row.colls.some(collision => collision.kind === 'hard')
          return (
            <button
              type="button"
              key={row.bindingRef.bindingId}
              role="option"
              className={`cmp-chord-detail__row${isSelected ? ' cmp-chord-detail__row--selected' : ''}`}
              aria-selected={isSelected}
              onClick={() => state.setSelectedRowIndex(index)}
            >
              <span
                className={`cmp-chord-detail__scope-dot${row.scope === 'global' ? ' cmp-chord-detail__scope-dot--global' : ''}`}
              />
              <span className="cmp-chord-detail__row-app">
                {row.scope} · <b>{row.app}</b>
              </span>
              <span className="cmp-chord-detail__row-action">{row.action}</span>
              <span className="cmp-chord-detail__row-meta">
                {hasHard ? (
                  <span
                    className="cmp-chord-detail__collision-icon cmp-chord-detail__collision-icon--warn"
                    title="Hard collision"
                  >
                    ⚠
                  </span>
                ) : row.colls.length > 0 && displayAdvisories ? (
                  <span
                    className="cmp-chord-detail__collision-icon cmp-chord-detail__collision-icon--soft"
                    title="Advisory"
                  >
                    ·
                  </span>
                ) : null}
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}
