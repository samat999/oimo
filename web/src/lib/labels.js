export const STATUS = {
  pending: 'Новый',
  confirmed: 'Подтверждён',
  rejected: 'Отклонён',
}

export const PERIOD = { day: 'День', week: 'Неделя', month: 'Месяц', year: 'Год' }

export const REJECT_REASONS = [
  { value: 'Серийный номер не виден на фото', label: 'Серийный номер не виден на фото' },
  { value: 'Серийный номер не совпадает', label: 'Серийный номер не совпадает' },
  { value: 'Модель не совпадает с фото', label: 'Модель не совпадает с фото' },
  { value: 'Фото нечитаемое', label: 'Фото нечитаемое' },
  { value: 'Нет фото товара', label: 'Нет фото товара' },
  { value: 'Сумма указана неверно', label: 'Сумма указана неверно' },
  { value: 'Дубль продажи', label: 'Дубль продажи' },
  { value: 'Другое', label: 'Другое' },
]

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function dayTitle(iso) {
  const s = String(iso || '').slice(0, 10)
  if (!s || s.length < 10) return s
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(`${s}T12:00:00+06:00`)
  return `${d} ${MONTHS[m - 1]} · ${WD[dt.getDay()]}`
}

export function shortDay(iso) {
  const s = String(iso || '').slice(0, 10)
  if (!s) return ''
  if (s.length === 2) return s
  return s.slice(8)
}

export function when(iso) {
  if (!iso) return ''
  const s = String(iso)
  const day = s.slice(0, 10)
  const t = s.slice(11, 16)
  const [y, m, d] = day.split('-')
  return t ? `${d}.${m}.${y} ${t}` : `${d}.${m}.${y}`
}
