import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { DEFAULT_ROLES } from './access.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const FILE = path.join(ROOT, 'data', 'db.json')
const UPLOADS = path.join(ROOT, 'data', 'uploads')

function uid(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex')
}

function hash(password) {
  return crypto.createHash('sha256').update(`oimo:${password}`).digest('hex')
}

export const DEFAULT_KPI = [
  { min: 1, max: 5, rate: 500, bonus: 0 },
  { min: 6, max: 10, rate: 700, bonus: 2000 },
  { min: 11, max: 15, rate: 900, bonus: 3000 },
  { min: 16, max: 20, rate: 1100, bonus: 4000 },
  { min: 21, max: 25, rate: 1300, bonus: 5000 },
  { min: 26, max: 30, rate: 1500, bonus: 6000 },
  { min: 31, max: 35, rate: 1700, bonus: 10000 },
]

function atDay(offset, hour) {
  const d = new Date()
  d.setHours(hour || 12, 20, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString()
}

function sale(userId, i, status, offset) {
  const models = ['OIMO Watch S', 'OIMO Air 2', 'OIMO Pad Mini', 'OIMO Buds']
  return {
    id: uid('sale'),
    userId,
    model: models[i % models.length],
    serial: `OIMO-${String(10000 + i).padStart(6, '0')}`,
    price: [12990, 18990, 24990, 7990][i % 4],
    payment: ['Наличные', 'Перевод', 'Рассрочка'][i % 3],
    comment: '',
    photoUrl: '/uploads/demo.svg',
    status,
    rejectReason: status === 'rejected' ? 'Серийный номер не читается на фото' : '',
    createdAt: atDay(offset, 10 + (i % 8)),
    decidedAt: status === 'pending' ? null : atDay(offset, 18),
    decidedBy: status === 'pending' ? null : 'owner',
  }
}

function seed() {
  const ownerId = uid('u')
  const s1 = uid('u')
  const s2 = uid('u')
  fs.mkdirSync(UPLOADS, { recursive: true })
  fs.writeFileSync(
    path.join(UPLOADS, 'demo.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect fill="#e8eef8" width="640" height="400"/><text x="320" y="200" text-anchor="middle" fill="#1976d2" font-size="28" font-family="sans-serif">OIMO</text></svg>',
  )
  const sales = []
  for (let i = 0; i < 18; i++) sales.push(sale(s1, i, 'confirmed', -Math.min(4, Math.floor(i / 4))))
  for (let i = 0; i < 9; i++) sales.push(sale(s2, 50 + i, 'confirmed', -Math.min(4, Math.floor(i / 3))))
  for (let i = 0; i < 12; i++) sales.push(sale(s1, 100 + i, 'confirmed', -7 - (i % 5)))
  for (let i = 0; i < 7; i++) sales.push(sale(s2, 130 + i, 'confirmed', -7 - (i % 5)))
  for (let i = 0; i < 8; i++) sales.push(sale(s1, 200 + i, 'confirmed', -28 - (i % 6)))
  for (let i = 0; i < 5; i++) sales.push(sale(s2, 220 + i, 'confirmed', -28 - (i % 6)))
  sales.push(sale(s1, 80, 'pending', 0))
  sales.push(sale(s1, 81, 'pending', 0))
  sales.push(sale(s2, 82, 'rejected', -1))
  return {
    users: [
      { id: ownerId, name: 'Азамат Оимо', login: 'owner', password: hash('Owner123'), role: 'owner', active: true, access: {} },
      { id: s1, name: 'Айбек Сатыбалдиев', login: 'aibek', password: hash('Seller123'), role: 'seller', active: true, access: {} },
      { id: s2, name: 'Алина Жунусова', login: 'alina', password: hash('Seller123'), role: 'seller', active: true, access: {} },
    ],
    sessions: [],
    sales,
    plans: [
      { id: uid('p'), scope: 'store', userId: null, period: 'week', pieces: 40, amount: 0 },
      { id: uid('p'), scope: 'user', userId: s1, period: 'week', pieces: 25, amount: 0 },
      { id: uid('p'), scope: 'user', userId: s2, period: 'week', pieces: 20, amount: 0 },
      { id: uid('p'), scope: 'user', userId: s1, period: 'month', pieces: 90, amount: 0 },
      { id: uid('p'), scope: 'user', userId: s2, period: 'month', pieces: 80, amount: 0 },
      { id: uid('p'), scope: 'store', userId: null, period: 'year', pieces: 1000, amount: 0 },
    ],
    kpi: DEFAULT_KPI,
    settings: {
      paymentTypes: ['Наличные', 'Перевод', 'Рассрочка'],
      rankingMetric: 'pieces',
      allowGallery: true,
      roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    },
    audit: [],
  }
}

export function load() {
  fs.mkdirSync(UPLOADS, { recursive: true })
  if (!fs.existsSync(FILE)) {
    const db = seed()
    save(db)
    return db
  }
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  if (!data.sales?.length) {
    const seeded = seed()
    save(seeded)
    return seeded
  }
  let changed = false
  data.settings = data.settings || {}
  if (!data.settings.roles) {
    data.settings.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES))
    changed = true
  }
  for (const u of data.users || []) {
    if (!u.access) {
      u.access = {}
      changed = true
    }
  }
  if (changed) save(data)
  return data
}

export function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
}

export function uploadsDir() {
  return UPLOADS
}

export { uid, hash, UPLOADS }
