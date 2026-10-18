const MONTHS: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const month = MONTHS[date.getUTCMonth()]
  if (!month) {
    return ''
  }
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`
}
