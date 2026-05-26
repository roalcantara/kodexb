import { configureRendererLogging } from '@shared/logging'
import { createRoot } from 'react-dom/client'
import { ListPage } from './pages/list/list.page'

configureRendererLogging()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

createRoot(rootEl).render(<ListPage />)
