const TOKEN = 'oimo_token'
const USER = 'oimo_user'

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER) || 'null')
  } catch {
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN) || ''
}

export function setAuth(d) {
  localStorage.setItem(TOKEN, d.token)
  localStorage.setItem(USER, JSON.stringify(d.user))
}

export function logout() {
  localStorage.removeItem(TOKEN)
  localStorage.removeItem(USER)
}

export async function api(path, opt = {}) {
  const headers = { ...(opt.headers || {}) }
  if (opt.body && !(opt.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...opt, headers })
  if (res.status === 401) {
    logout()
    if (!location.pathname.startsWith('/login')) location.href = '/login'
    throw new Error('Нужен вход')
  }
  if (res.headers.get('content-type')?.includes('sheet')) return res.blob()
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
  return data
}

export const som = (n) => `${Number(n || 0).toLocaleString('ru-RU')} сом`

export function setUser(u) {
  localStorage.setItem(USER, JSON.stringify(u))
}

const FALLBACK = {
  seller: { home: 'view', sale: 'edit', sales: 'view', rank: 'view' },
  manager: { home: 'view', rank: 'view', review: 'edit', journal: 'view', team: 'view', plans: 'edit', kpi: 'view' },
}

export function can(module, action = 'view') {
  const u = getUser()
  if (!u) return false
  if (u.role === 'owner') return true
  if (u.access && u.access[module]) return !!u.access[module][action]
  const lvl = FALLBACK[u.role]?.[module]
  if (!lvl) return false
  if (action === 'view') return lvl === 'view' || lvl === 'edit'
  return lvl === 'edit'
}

export function isStaff() {
  const u = getUser()
  return u && u.role !== 'seller'
}

export const ROLE_NAME = { owner: 'Владелец', manager: 'Менеджер', seller: 'Продавец' }
