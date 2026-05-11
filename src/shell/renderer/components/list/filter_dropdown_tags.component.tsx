type TagRow = { tag: string; count: number }

export type FilterDropdownTagsProps = {
  tagRows: TagRow[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

export function FilterDropdownTags({ tagRows, selectedTags, onToggle }: FilterDropdownTagsProps) {
  return (
    <section className="kb-filterSection">
      <div className="kb-filterSection-title">Tags</div>
      <div className="kb-filterTagList">
        {tagRows.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            className={selectedTags.includes(tag) ? 'kb-filterRow kb-filterRow--on' : 'kb-filterRow'}
            onClick={() => onToggle(tag)}
          >
            #{tag} ({count})
          </button>
        ))}
      </div>
    </section>
  )
}
