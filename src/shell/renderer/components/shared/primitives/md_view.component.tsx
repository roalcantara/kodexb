import { fireAndForget } from '@shared/utils'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

export type MdViewProps = {
  markdown: string
  onOpenExternal?: (url: string) => void | Promise<void>
}

export function MdView({ markdown, onOpenExternal }: MdViewProps) {
  return (
    <div className="cmp-md-view">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <button
              type="button"
              className="cmp-md-view-link"
              onClick={() => {
                if (href) fireAndForget(Promise.resolve(onOpenExternal?.(href)))
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
