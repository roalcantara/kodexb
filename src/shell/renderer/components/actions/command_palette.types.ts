export type CommandPaletteSection = 'entry' | 'clipboard' | 'source' | 'library' | 'app'

export const COMMAND_PALETTE_SECTION_LABEL: Record<CommandPaletteSection, string> = {
  entry: 'This entry',
  clipboard: 'Clipboard',
  source: 'Source',
  library: 'Library',
  app: 'App'
}

export type CommandPaletteAction = {
  id: string
  label: string
  section: CommandPaletteSection
  shortcut?: string
  handler: () => void
}

export type CommandPaletteProps = {
  open: boolean
  actions: CommandPaletteAction[]
  onClose: () => void
}
