export const MODULES = [
  { id: 'home', label: 'Главная' },
  { id: 'sale', label: 'Новая продажа' },
  { id: 'sales', label: 'Журнал — свои продажи' },
  { id: 'rank', label: 'Гонка' },
  { id: 'review', label: 'Проверка' },
  { id: 'journal', label: 'Журнал' },
  { id: 'team', label: 'Сотрудники' },
  { id: 'plans', label: 'Планы' },
  { id: 'kpi', label: 'KPI' },
  { id: 'access', label: 'Роли и доступ' },
]

function all(on) {
  return Object.fromEntries(MODULES.map((m) => [m.id, { view: on, edit: on }]))
}

export const DEFAULT_ROLES = {
  owner: all(true),
  manager: {
    home: { view: true, edit: false },
    sale: { view: false, edit: false },
    sales: { view: false, edit: false },
    rank: { view: true, edit: false },
    review: { view: true, edit: true },
    journal: { view: true, edit: false },
    team: { view: true, edit: false },
    plans: { view: true, edit: true },
    kpi: { view: true, edit: false },
    access: { view: false, edit: false },
  },
  seller: {
    home: { view: true, edit: false },
    sale: { view: true, edit: true },
    sales: { view: true, edit: false },
    rank: { view: true, edit: false },
    review: { view: false, edit: false },
    journal: { view: false, edit: false },
    team: { view: false, edit: false },
    plans: { view: false, edit: false },
    kpi: { view: false, edit: false },
    access: { view: false, edit: false },
  },
}

export function effectiveAccess(user, settings = {}) {
  if (!user) return all(false)
  if (user.role === 'owner') return all(true)
  const roleMap = settings.roles?.[user.role] || DEFAULT_ROLES[user.role] || DEFAULT_ROLES.seller
  const own = user.access || {}
  const out = {}
  for (const m of MODULES) {
    const r = roleMap[m.id] || { view: false, edit: false }
    const o = own[m.id] || {}
    out[m.id] = {
      view: typeof o.view === 'boolean' ? o.view : !!r.view,
      edit: typeof o.edit === 'boolean' ? o.edit : !!r.edit,
    }
  }
  return out
}

export function can(user, settings, module, action = 'view') {
  if (!user) return false
  if (user.role === 'owner') return true
  return !!effectiveAccess(user, settings)[module]?.[action]
}

export function startPath(user, settings) {
  if (!user) return '/login'
  if (can(user, settings, 'review', 'view') || user.role === 'owner' || user.role === 'manager') return '/owner'
  return '/'
}
