export function onBindingRowEnterKeyDown(
  event: React.KeyboardEvent,
  onPrimary: () => void,
  onSecondary: () => void
): void {
  if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    onPrimary()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    onSecondary()
  }
}
