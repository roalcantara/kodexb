type TagRow = { tag: string; count: number }

export type FilterDropdownTagsProps = {
  tagRows: TagRow[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

export function FilterDropdownTags({ tagRows, selectedTags, onToggle }: FilterDropdownTagsProps) {
  return (
    <section className="cmp-filter-section">
      <div className="cmp-filter-section-title">Tags</div>
      <div className="cmp-filter-tag-list">
        {tagRows.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            className={selectedTags.includes(tag) ? 'cmp-filter-row cmp-filter-row--on' : 'cmp-filter-row'}
            onClick={() => onToggle(tag)}
          >
            #{tag} ({count})
          </button>
        ))}
      </div>
    </section>
  )
}
