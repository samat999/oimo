import { PERIOD } from './labels.js'

const PREV = {
  day: 'вчера',
  week: 'прошлой неделе',
  month: 'прошлом месяце',
  year: 'прошлом году',
}

const NOW = {
  day: 'сегодня',
  week: 'эту неделю',
  month: 'этот месяц',
  year: 'этот год',
}

export function periodNow(period) {
  return NOW[period] || 'этот период'
}

export function pcs(n) {
  const v = Math.abs(Number(n) || 0)
  const m10 = v % 10
  const m100 = v % 100
  if (m10 === 1 && m100 !== 11) return 'продажу'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'продажи'
  return 'продаж'
}

export function vsHuman(x, unit, period) {
  const cur = Number(x?.value || 0)
  const prev = Number(x?.prev || 0)
  const diff = cur - prev
  const when = PREV[period] || 'прошлом периоде'
  if (!prev && !cur) return `пока как ${when}`
  if (!diff) return `столько же, как ${when}`
  const n = Math.abs(diff)
  const word = unit === 'сом' ? somShort(n) : `${n} ${unit}`
  return `${diff > 0 ? 'на' : 'на'} ${word} ${diff > 0 ? 'больше' : 'меньше'}, чем ${when}`
}

export function somShort(n) {
  const v = Math.round(Number(n || 0))
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')} млн сом`
  if (v >= 1000) return `${Math.round(v / 1000)} тыс. сом`
  return `${v} сом`
}

export function insight(d, period) {
  const sales = d.kpis?.sales || {}
  const revenue = d.kpis?.revenue || {}
  const plan = d.plan || {}
  const fact = Number(plan.fact || sales.value || 0)
  const need = Number(plan.pieces || 0)
  const leftover = Math.max(0, need - fact)
  const funnel = d.funnel || []
  const reports = funnel.find((f) => f.key === 'reports')?.n || 0
  const confirmed = funnel.find((f) => f.key === 'confirmed')?.n || 0
  const pending = funnel.find((f) => f.key === 'pending')?.n || 0
  const rejected = funnel.find((f) => f.key === 'rejected')?.n || 0
  const conversion = reports ? Math.round((confirmed / reports) * 100) : 0
  const avgCheck = confirmed ? Math.round(Number(revenue.value || 0) / confirmed) : 0
  const best = [...(d.byDay || [])].sort((a, b) => (b.count || 0) - (a.count || 0))[0]
  return {
    periodLabel: PERIOD[period] || 'Неделя',
    now: periodNow(period),
    leftover,
    conversion,
    avgCheck,
    reports,
    confirmed,
    pending,
    rejected,
    best: best && best.count ? best : null,
    salesVs: vsHuman(sales, 'шт', period),
    revenueVs: vsHuman(revenue, 'сом', period),
  }
}
