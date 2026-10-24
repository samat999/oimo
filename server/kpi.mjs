const TZ = 'Asia/Bishkek'

export function nowParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return map
}

export function isoDate(date) {
  const p = nowParts(date)
  return `${p.year}-${p.month}-${p.day}`
}

export function weekBounds(date = new Date()) {
  const p = nowParts(date)
  const d = new Date(`${p.year}-${p.month}-${p.day}T12:00:00+06:00`)
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  const mondayOffset = wd === 0 ? -6 : 1 - wd
  const start = new Date(d)
  start.setDate(d.getDate() + mondayOffset)
  const days = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    days.push(isoDate(x))
  }
  return { from: days[0], to: days[6], days }
}

export function monthBounds(date = new Date()) {
  const p = nowParts(date)
  const last = new Date(Number(p.year), Number(p.month), 0).getDate()
  return { from: `${p.year}-${p.month}-01`, to: `${p.year}-${p.month}-${String(last).padStart(2, '0')}` }
}

export function yearBounds(date = new Date()) {
  const p = nowParts(date)
  return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
}

export function inRange(iso, from, to) {
  const day = String(iso).slice(0, 10)
  return day >= from && day <= to
}

export function bandFor(count, kpi) {
  if (count <= 0) return null
  const sorted = [...kpi].sort((a, b) => a.min - b.min)
  let found = sorted[0]
  for (const b of sorted) {
    if (count >= b.min) found = b
  }
  return found
}

export function nextBand(count, kpi) {
  const sorted = [...kpi].sort((a, b) => a.min - b.min)
  return sorted.find((b) => count < b.min) ?? null
}

export function salaryFor(count, kpi) {
  const band = bandFor(count, kpi)
  if (!band) return { count, rate: 0, bonus: 0, total: 0, band: null }
  return {
    count,
    rate: band.rate,
    bonus: band.bonus,
    total: count * band.rate + band.bonus,
    band,
  }
}

export function confirmedIn(sales, userId, from, to) {
  return sales.filter(
    (s) => s.status === 'confirmed' && (!userId || s.userId === userId) && inRange(s.createdAt, from, to),
  )
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00+06:00`)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function periodBounds(period = 'week') {
  const p = nowParts()
  if (period === 'day') {
    const t = isoDate(new Date())
    const y = addDays(t, -1)
    return { from: t, to: t, days: [t], prevFrom: y, prevTo: y, planPeriod: 'week' }
  }
  if (period === 'month') {
    const m = monthBounds()
    let y = Number(p.year)
    let mo = Number(p.month) - 1
    if (mo === 0) {
      mo = 12
      y -= 1
    }
    const lastPrev = new Date(y, mo, 0).getDate()
    const days = []
    const last = Number(m.to.slice(8))
    for (let i = 1; i <= last; i++) days.push(`${p.year}-${p.month}-${String(i).padStart(2, '0')}`)
    return {
      from: m.from,
      to: m.to,
      days,
      prevFrom: `${y}-${String(mo).padStart(2, '0')}-01`,
      prevTo: `${y}-${String(mo).padStart(2, '0')}-${String(lastPrev).padStart(2, '0')}`,
      planPeriod: 'month',
    }
  }
  if (period === 'year') {
    const y = yearBounds()
    const py = String(Number(p.year) - 1)
    return {
      from: y.from,
      to: y.to,
      days: Array.from({ length: 12 }, (_, i) => `${p.year}-${String(i + 1).padStart(2, '0')}-01`),
      prevFrom: `${py}-01-01`,
      prevTo: `${py}-12-31`,
      planPeriod: 'year',
    }
  }
  const w = weekBounds()
  return { ...w, prevFrom: addDays(w.from, -7), prevTo: addDays(w.to, -7), planPeriod: 'week' }
}

export function delta(cur, prev) {
  if (!prev) return { pct: cur ? 100 : 0, dir: cur > 0 ? 'up' : 'flat', prev: 0 }
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { pct: Math.abs(pct), dir: cur > prev ? 'up' : cur < prev ? 'down' : 'flat', prev }
}
