type TagRow = { tag: string; count: number }

export type FilterDropdownTagsProps = {
  tagRows: TagRow[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

export function FilterDropdownTags({ tagRows, selectedTags, onToggle }: FilterDropdownTagsProps) {
  return (
    <section className="theme-filter-section">
      <div className="theme-filter-section-title">Tags</div>
      <div className="theme-filter-tag-list">
        {tagRows.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            className={selectedTags.includes(tag) ? 'theme-filter-row theme-filter-row--on' : 'theme-filter-row'}
            onClick={() => onToggle(tag)}
          >
            #{tag} ({count})
          </button>
        ))}
      </div>
    </section>
  )
}
