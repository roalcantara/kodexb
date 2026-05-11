import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

export type MdViewProps = {
  markdown: string
  onOpenExternal?: (url: string) => void | Promise<void>
}

export function MdView({ markdown, onOpenExternal }: MdViewProps) {
  return (
    <div className="kb-mdView">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <button
              type="button"
              className="kb-mdView-link"
              onClick={() => {
                if (href) Promise.resolve(onOpenExternal?.(href)).catch(() => undefined)
              }}
              title={href}
            >
              {children}
            </button>
          )
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
