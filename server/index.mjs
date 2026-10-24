import express from 'express'
import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import { hash, load, save, uid, uploadsDir } from './db.mjs'
import {
  confirmedIn,
  inRange,
  isoDate,
  nextBand,
  nowParts,
  periodBounds,
  salaryFor,
  weekBounds,
  delta,
} from './kpi.mjs'
import { MODULES, DEFAULT_ROLES, can as canDo, effectiveAccess, startPath } from './access.mjs'

const app = express()
const PORT = Number(process.env.PORT) || 4174
const distDir = path.resolve(import.meta.dirname, '../web/dist')
app.use(express.json({ limit: '12mb' }))
app.use('/uploads', express.static(uploadsDir()))

function db() {
  return load()
}

function persist(data) {
  save(data)
}

function publicUser(u, data) {
  const settings = data?.settings || {}
  return {
    id: u.id,
    name: u.name,
    login: u.login,
    role: u.role,
    active: u.active,
    access: effectiveAccess(u, settings),
  }
}

function auth(req, _res, next) {
  const token = String(req.headers.authorization || '').replace('Bearer ', '')
  const data = db()
  const session = data.sessions.find((s) => s.token === token)
  const user = session ? data.users.find((u) => u.id === session.userId && u.active) : null
  req.user = user || null
  req.db = data
  next()
}

function need(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Нужен вход' })
    if (roles.length && !roles.includes(req.user.role) && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Недостаточно прав' })
    }
    next()
  }
}

function needMod(module, action = 'view') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Нужен вход' })
    if (!canDo(req.user, req.db.settings, module, action)) {
      return res.status(403).json({ error: 'Нет доступа к модулю' })
    }
    next()
  }
}

function leadersOf(data) {
  const pick = (list) => (list[0]?.pieces ? { userId: list[0].userId, name: list[0].name, pieces: list[0].pieces } : null)
  const w = periodBounds('week')
  const m = periodBounds('month')
  return {
    week: pick(rank(data, w.from, w.to, 'week')),
    month: pick(rank(data, m.from, m.to, 'month')),
  }
}

function audit(data, user, action, detail, reason = '') {
  data.audit.unshift({
    id: uid('a'),
    userId: user?.id || null,
    name: user?.name || 'система',
    action,
    detail,
    reason,
    at: new Date().toISOString(),
  })
}

function savePhoto(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith('data:')) return null
  const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!m) return null
  const ext = m[1].includes('png') ? 'png' : 'jpg'
  const name = `${uid('ph')}.${ext}`
  fs.writeFileSync(path.join(uploadsDir(), name), Buffer.from(m[2], 'base64'))
  return `/uploads/${name}`
}

function planOf(data, userId, period) {
  return (
    data.plans.find((p) => p.period === period && p.userId === userId) ||
    data.plans.find((p) => p.period === period && p.scope === 'store') ||
    { pieces: 0, amount: 0 }
  )
}

function saleView(s, users) {
  const u = users.find((x) => x.id === s.userId)
  return { ...s, sellerName: u?.name || '' }
}

function periodKey(req) {
  const p = String(req.query.period || 'week')
  return ['day', 'week', 'month', 'year'].includes(p) ? p : 'week'
}

function greetingNow() {
  const p = nowParts()
  const h = Number(p.hour)
  const hi = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const weekdays = { Mon: 'понедельник', Tue: 'вторник', Wed: 'среда', Thu: 'четверг', Fri: 'пятница', Sat: 'суббота', Sun: 'воскресенье' }
  return { hi, date: `${weekdays[p.weekday]}, ${Number(p.day)} ${months[Number(p.month) - 1]} ${p.year}` }
}

function sumPrice(list) {
  return list.reduce((a, s) => a + Number(s.price || 0), 0)
}

function seriesFor(period, bounds, sales, userId) {
  if (period === 'year') {
    return bounds.days.map((d) => {
      const from = d
      const y = d.slice(0, 4)
      const m = d.slice(5, 7)
      const last = new Date(Number(y), Number(m), 0).getDate()
      const to = `${y}-${m}-${String(last).padStart(2, '0')}`
      return { date: m, label: m, count: confirmedIn(sales, userId, from, to).length }
    })
  }
  return bounds.days.map((d) => ({
    date: d,
    label: d.slice(8),
    count: confirmedIn(sales, userId, d, d).length,
  }))
}

function funnelFor(sales, userId, from, to) {
  const mine = sales.filter((s) => (!userId || s.userId === userId) && inRange(s.createdAt, from, to))
  const n = (st) => mine.filter((s) => s.status === st).length
  const reports = mine.length
  const pending = n('pending')
  const confirmed = n('confirmed')
  const rejected = n('rejected')
  const max = Math.max(reports, 1)
  return [
    { key: 'reports', label: 'Отчёты', n: reports, pct: 100 },
    { key: 'pending', label: 'На проверке', n: pending, pct: Math.round((pending / max) * 100) },
    { key: 'confirmed', label: 'Подтверждено', n: confirmed, pct: Math.round((confirmed / max) * 100) },
    { key: 'rejected', label: 'Отклонено', n: rejected, pct: Math.round((rejected / max) * 100) },
  ]
}

function statsFor(data, userId, period = 'week') {
  const b = periodBounds(period)
  const week = weekBounds()
  const sales = data.sales
  const curList = confirmedIn(sales, userId, b.from, b.to)
  const prevList = confirmedIn(sales, userId, b.prevFrom, b.prevTo)
  const curN = curList.length
  const weekN = confirmedIn(sales, userId, week.from, week.to).length
  const pay = salaryFor(weekN, data.kpi)
  const nxt = nextBand(weekN, data.kpi)
  const plan = planOf(data, userId, b.planPeriod)
  const rankList = rank(data, b.from, b.to, b.planPeriod)
  const place = rankList.findIndex((r) => r.userId === userId) + 1
  const today = isoDate(new Date())
  return {
    greeting: greetingNow(),
    period,
    range: { from: b.from, to: b.to, prevFrom: b.prevFrom, prevTo: b.prevTo },
    kpis: {
      sales: { value: curN, ...delta(curN, prevList.length) },
      revenue: { value: sumPrice(curList), ...delta(sumPrice(curList), sumPrice(prevList)) },
      pending: {
        value: sales.filter((s) => s.userId === userId && s.status === 'pending' && inRange(s.createdAt, b.from, b.to)).length,
      },
      salary: { value: pay.total, bonus: pay.bonus, rate: pay.rate, count: weekN },
    },
    funnel: funnelFor(sales, userId, b.from, b.to),
    plan: {
      pieces: plan.pieces,
      fact: curN,
      pct: plan.pieces ? Math.round((curN / plan.pieces) * 100) : 0,
      amount: plan.amount,
      period: b.planPeriod,
    },
    pay,
    next: nxt
      ? { min: nxt.min, left: Math.max(0, nxt.min - weekN), total: nxt.min * nxt.rate + nxt.bonus }
      : null,
    byDay: seriesFor(period, b, sales, userId).map((row) => ({
      ...row,
      plan: plan.pieces && period === 'week' ? Math.round(plan.pieces / 7) : plan.pieces && period === 'month' ? Math.round(plan.pieces / Math.max(b.days?.length || 1, 1)) : 0,
    })),
    place: place || rankList.length + 1,
    team: rankList.length,
    ranking: rankList,
    today: confirmedIn(sales, userId, today, today).length,
  }
}

function rank(data, from, to, planPeriod = 'week') {
  return data.users
    .filter((u) => u.role === 'seller' && u.active)
    .map((u) => {
      const list = confirmedIn(data.sales, u.id, from, to)
      const plan = planOf(data, u.id, planPeriod)
      const weekN = confirmedIn(data.sales, u.id, weekBounds().from, weekBounds().to).length
      const pay = salaryFor(weekN, data.kpi)
      return {
        userId: u.id,
        name: u.name,
        pieces: list.length,
        revenue: sumPrice(list),
        plan: plan.pieces,
        pct: plan.pieces ? Math.round((list.length / plan.pieces) * 100) : 0,
        salary: pay.total,
        rate: pay.rate,
        bonus: pay.bonus,
      }
    })
    .sort((a, b) => b.pieces - a.pieces || b.revenue - a.revenue)
}

app.use(auth)

app.post('/api/login', (req, res) => {
  const data = db()
  const login = String(req.body.login || '').trim().toLowerCase()
  const password = hash(String(req.body.password || ''))
  const user = data.users.find((u) => u.login === login && u.password === password && u.active)
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' })
  const token = uid('s')
  data.sessions.push({ token, userId: user.id, at: new Date().toISOString() })
  persist(data)
  res.json({ token, user: publicUser(user, data), start: startPath(user, data.settings) })
})

app.get('/api/me', need(), (req, res) => {
  res.json({
    user: publicUser(req.user, req.db),
    settings: { paymentTypes: req.db.settings.paymentTypes, allowGallery: req.db.settings.allowGallery },
    modules: MODULES,
    leaders: leadersOf(req.db),
    start: startPath(req.user, req.db.settings),
  })
})

app.get('/api/seller/home', needMod('home'), (req, res) => {
  res.json({ ...statsFor(req.db, req.user.id, periodKey(req)), leaders: leadersOf(req.db) })
})

app.get('/api/seller/sales', needMod('sales'), (req, res) => {
  const rows = req.db.sales
    .filter((s) => s.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => saleView(s, req.db.users))
  res.json({ sales: rows })
})

app.get('/api/rank', needMod('rank'), (req, res) => {
  const key = periodKey(req)
  const b = periodBounds(key)
  const list = rank(req.db, b.from, b.to, b.planPeriod).map((r, i) => ({ ...r, place: i + 1 }))
  if (req.user.role === 'seller') {
    res.json({
      period: { key, from: b.from, to: b.to },
      ranking: list.map((r) => ({
        place: r.place,
        name: r.name,
        pieces: r.pieces,
        pct: r.pct,
        mine: r.userId === req.user.id,
      })),
    })
    return
  }
  res.json({ period: { key, from: b.from, to: b.to }, ranking: list.map((r) => ({ ...r, mine: false })) })
})

app.post('/api/sales', needMod('sale', 'edit'), (req, res) => {
  const data = req.db
  const model = String(req.body.model || '').trim()
  const serial = String(req.body.serial || '').trim().toUpperCase()
  const price = Number(req.body.price)
  const payment = String(req.body.payment || '').trim()
  const comment = String(req.body.comment || '').trim()
  if (!model) return res.status(400).json({ error: 'Укажите модель товара' })
  if (!serial) return res.status(400).json({ error: 'Укажите серийный номер' })
  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Укажите фактическую цену в сомах' })
  if (!data.settings.paymentTypes.includes(payment)) return res.status(400).json({ error: 'Выберите тип оплаты' })
  const dup = data.sales.find((s) => s.serial === serial && s.status !== 'rejected')
  if (dup) return res.status(409).json({ error: 'Этот серийный номер уже есть в системе', duplicate: true })
  const photoUrl = savePhoto(req.body.photo)
  if (!photoUrl) return res.status(400).json({ error: 'Добавьте фотографию товара' })
  const row = {
    id: uid('sale'),
    userId: req.user.id,
    model,
    serial,
    price,
    payment,
    comment,
    photoUrl,
    status: 'pending',
    rejectReason: '',
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null,
  }
  data.sales.unshift(row)
  audit(data, req.user, 'sale.create', `${model} · ${serial} · ${price} сом`)
  persist(data)
  res.json({ ok: true, sale: saleView(row, data.users) })
})

app.get('/api/owner/overview', needMod('home'), (req, res) => {
  const data = req.db
  const period = periodKey(req)
  const b = periodBounds(period)
  const week = weekBounds()
  const inP = (s) => inRange(s.createdAt, b.from, b.to)
  const confirmed = data.sales.filter((s) => s.status === 'confirmed' && inP(s))
  const prev = data.sales.filter((s) => s.status === 'confirmed' && inRange(s.createdAt, b.prevFrom, b.prevTo))
  const pending = data.sales.filter((s) => s.status === 'pending' && inP(s))
  const rejected = data.sales.filter((s) => s.status === 'rejected' && inP(s))
  const team = rank(data, b.from, b.to, b.planPeriod)
  const storePlan = planOf(data, null, b.planPeriod)
  const fact = confirmed.length
  res.json({
    greeting: greetingNow(),
    period,
    range: { from: b.from, to: b.to, prevFrom: b.prevFrom, prevTo: b.prevTo },
    kpis: {
      sales: { value: fact, ...delta(fact, prev.length) },
      revenue: { value: sumPrice(confirmed), ...delta(sumPrice(confirmed), sumPrice(prev)) },
      pending: { value: pending.length },
      payroll: { value: team.reduce((a, t) => a + t.salary, 0) },
    },
    funnel: funnelFor(data.sales, null, b.from, b.to),
    plan: {
      pieces: storePlan.pieces,
      fact,
      pct: storePlan.pieces ? Math.round((fact / storePlan.pieces) * 100) : 0,
      period: b.planPeriod,
    },
    byDay: seriesFor(period, b, data.sales, null).map((row) => ({
      ...row,
      plan:
        storePlan.pieces && period === 'week'
          ? Math.round(storePlan.pieces / 7)
          : storePlan.pieces && period === 'month'
            ? Math.round(storePlan.pieces / Math.max(b.days.length, 1))
            : 0,
    })),
    week,
    confirmed: fact,
    revenue: sumPrice(confirmed),
    pending: pending.length,
    rejected: rejected.length,
    payroll: team.reduce((a, t) => a + t.salary, 0),
    team,
    leaders: leadersOf(data),
  })
})

app.get('/api/owner/sales', need(), (req, res) => {
  if (!canDo(req.user, req.db.settings, 'journal', 'view') && !canDo(req.user, req.db.settings, 'review', 'view')) {
    return res.status(403).json({ error: 'Нет доступа к модулю' })
  }
  const q = req.query
  let rows = req.db.sales.map((s) => saleView(s, req.db.users))
  if (q.status) rows = rows.filter((s) => s.status === q.status)
  if (q.userId) rows = rows.filter((s) => s.userId === q.userId)
  if (q.model) rows = rows.filter((s) => s.model.toLowerCase().includes(String(q.model).toLowerCase()))
  if (q.serial) rows = rows.filter((s) => s.serial.includes(String(q.serial).toUpperCase()))
  if (q.from) rows = rows.filter((s) => s.createdAt.slice(0, 10) >= q.from)
  if (q.to) rows = rows.filter((s) => s.createdAt.slice(0, 10) <= q.to)
  res.json({ sales: rows })
})

app.post('/api/owner/sales/:id/decide', needMod('review', 'edit'), (req, res) => {
  const data = req.db
  const row = data.sales.find((s) => s.id === req.params.id)
  if (!row) return res.status(404).json({ error: 'Отчёт не найден' })
  const ok = req.body.decision === 'confirmed'
  if (!ok && !String(req.body.reason || '').trim()) return res.status(400).json({ error: 'Укажите причину отклонения' })
  const prev = { status: row.status, rejectReason: row.rejectReason }
  row.status = ok ? 'confirmed' : 'rejected'
  row.rejectReason = ok ? '' : String(req.body.reason).trim()
  row.decidedAt = new Date().toISOString()
  row.decidedBy = req.user.id
  audit(
    data,
    req.user,
    ok ? 'sale.confirm' : 'sale.reject',
    `${row.serial} ${prev.status} → ${row.status}`,
    row.rejectReason,
  )
  persist(data)
  res.json({ ok: true, sale: saleView(row, data.users) })
})

app.get('/api/owner/users', needMod('team'), (req, res) => {
  res.json({
    users: req.db.users.filter((u) => u.role !== 'owner').map((u) => publicUser(u, req.db)),
  })
})

app.post('/api/owner/users', needMod('team', 'edit'), (req, res) => {
  const data = req.db
  const name = String(req.body.name || '').trim()
  const login = String(req.body.login || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const role = ['seller', 'manager'].includes(req.body.role) ? req.body.role : 'seller'
  if (!name || !login || password.length < 6) return res.status(400).json({ error: 'Имя, логин и пароль от 6 символов' })
  if (data.users.some((u) => u.login === login)) return res.status(409).json({ error: 'Такой логин уже есть' })
  const user = { id: uid('u'), name, login, password: hash(password), role, active: true, access: {} }
  data.users.push(user)
  audit(data, req.user, 'user.create', `${name} (${login}) · ${role}`)
  persist(data)
  res.json({ user: publicUser(user, data) })
})

app.get('/api/owner/users/:id', needMod('team'), (req, res) => {
  const user = req.db.users.find((u) => u.id === req.params.id && u.role !== 'owner')
  if (!user) return res.status(404).json({ error: 'Сотрудник не найден' })
  const recent = req.db.sales
    .filter((s) => s.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((s) => saleView(s, req.db.users))
  res.json({
    user: publicUser(user, req.db),
    rawAccess: user.access || {},
    stats: statsFor(req.db, user.id, 'week'),
    recent,
  })
})

app.post('/api/owner/users/:id', needMod('team', 'edit'), (req, res) => {
  const data = req.db
  const user = data.users.find((u) => u.id === req.params.id && u.role !== 'owner')
  if (!user) return res.status(404).json({ error: 'Сотрудник не найден' })
  const name = String(req.body.name || '').trim()
  const login = String(req.body.login || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  if (!name || !login) return res.status(400).json({ error: 'Укажите имя и логин' })
  if (data.users.some((u) => u.login === login && u.id !== user.id)) return res.status(409).json({ error: 'Такой логин уже есть' })
  user.name = name
  user.login = login
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Пароль от 6 символов' })
    user.password = hash(password)
  }
  if (typeof req.body.active === 'boolean') user.active = req.body.active
  if (['seller', 'manager'].includes(req.body.role)) user.role = req.body.role
  if (req.body.access && typeof req.body.access === 'object') user.access = req.body.access
  audit(data, req.user, 'user.update', `${user.name} (${user.login})`)
  persist(data)
  res.json({ user: publicUser(user, data) })
})

app.post('/api/owner/users/:id/toggle', needMod('team', 'edit'), (req, res) => {
  const data = req.db
  const user = data.users.find((u) => u.id === req.params.id && u.role !== 'owner')
  if (!user) return res.status(404).json({ error: 'Сотрудник не найден' })
  user.active = !user.active
  audit(data, req.user, user.active ? 'user.enable' : 'user.block', user.name)
  persist(data)
  res.json({ user: publicUser(user, data) })
})

app.get('/api/owner/roles', needMod('access'), (req, res) => {
  res.json({
    modules: MODULES,
    roles: req.db.settings.roles || DEFAULT_ROLES,
    defaults: DEFAULT_ROLES,
  })
})

app.post('/api/owner/roles', needMod('access', 'edit'), (req, res) => {
  const roles = req.body.roles
  if (!roles || typeof roles !== 'object') return res.status(400).json({ error: 'Нет таблицы ролей' })
  req.db.settings.roles = roles
  req.db.settings.roles.owner = DEFAULT_ROLES.owner
  audit(req.db, req.user, 'roles.update', Object.keys(roles).join(', '))
  persist(req.db)
  res.json({ roles: req.db.settings.roles })
})

app.get('/api/owner/plans', needMod('plans'), (req, res) => {
  res.json({ plans: req.db.plans, users: req.db.users.filter((u) => u.role === 'seller').map((u) => publicUser(u, req.db)) })
})

app.post('/api/owner/plans', needMod('plans', 'edit'), (req, res) => {
  const data = req.db
  const period = req.body.period
  const userId = req.body.userId || null
  const pieces = Number(req.body.pieces) || 0
  const amount = Number(req.body.amount) || 0
  if (!['week', 'month', 'year'].includes(period)) return res.status(400).json({ error: 'Период: week, month, year' })
  let row = data.plans.find((p) => p.period === period && (p.userId || null) === userId)
  if (!row) {
    row = { id: uid('p'), scope: userId ? 'user' : 'store', userId, period, pieces, amount }
    data.plans.push(row)
  } else {
    row.pieces = pieces
    row.amount = amount
  }
  audit(data, req.user, 'plan.set', `${period} ${userId || 'магазин'} = ${pieces} шт`)
  persist(data)
  res.json({ plan: row })
})

app.get('/api/owner/kpi', needMod('kpi'), (req, res) => {
  const w = periodBounds('week')
  res.json({ kpi: req.db.kpi, team: rank(req.db, w.from, w.to, 'week') })
})

app.post('/api/owner/kpi', needMod('kpi', 'edit'), (req, res) => {
  const rows = Array.isArray(req.body.kpi) ? req.body.kpi : []
  if (!rows.length) return res.status(400).json({ error: 'Таблица KPI пустая' })
  req.db.kpi = rows.map((r) => ({
    min: Number(r.min),
    max: Number(r.max),
    rate: Number(r.rate),
    bonus: Number(r.bonus) || 0,
  }))
  audit(req.db, req.user, 'kpi.update', `${req.db.kpi.length} диапазонов`)
  persist(req.db)
  res.json({ kpi: req.db.kpi })
})

app.get('/api/owner/audit', needMod('access'), (req, res) => {
  res.json({ audit: req.db.audit.slice(0, 200) })
})

app.get('/api/owner/export.xlsx', needMod('home'), (req, res) => {
  const data = req.db
  const week = weekBounds()
  const sales = data.sales.map((s) => saleView(s, data.users))
  const team = rank(data, week.from, week.to).map((r) => {
    const pay = salaryFor(r.pieces, data.kpi)
    return { ...r, rate: pay.rate, bonus: pay.bonus, salary: pay.total }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      sales.map((s) => ({
        Дата: s.createdAt,
        Сотрудник: s.sellerName,
        Модель: s.model,
        Серийный: s.serial,
        Цена: s.price,
        Оплата: s.payment,
        Статус: s.status,
        Причина: s.rejectReason,
      })),
    ),
    'Продажи',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      team.map((t, i) => ({
        Место: i + 1,
        Сотрудник: t.name,
        Продаж: t.pieces,
        Выручка: t.revenue,
        Ставка: t.rate,
        Бонус: t.bonus,
        Зарплата: t.salary,
      })),
    ),
    'Зарплата',
  )
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="oimo-otchet.xlsx"')
  res.send(buf)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OIMO http://127.0.0.1:${PORT}`)
})
