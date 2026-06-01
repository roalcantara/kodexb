export type EnGbDateStyle = 'short' | 'withYear'

export function formatEnGbDate(ms: number | undefined | null, style: EnGbDateStyle = 'short'): string {
  if (ms === undefined || ms === null) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const options: Intl.DateTimeFormatOptions =
    style === 'withYear' ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short' }
  return new Intl.DateTimeFormat('en-GB', options).format(d)
}
