import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './styles.css'
import { can, getUser } from './api.js'
import Login from './pages/Login.vue'
import SellerHome from './pages/seller/Home.vue'
import NewSale from './pages/seller/NewSale.vue'
import Rank from './pages/seller/Rank.vue'
import OwnerHome from './pages/owner/Home.vue'
import Review from './pages/owner/Review.vue'
import Journal from './pages/owner/Journal.vue'
import Team from './pages/owner/Team.vue'
import Employee from './pages/owner/Employee.vue'
import Plans from './pages/owner/Plans.vue'
import Kpi from './pages/owner/Kpi.vue'
import Access from './pages/owner/Access.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: SellerHome, meta: { module: 'home' } },
    { path: '/new', component: NewSale, meta: { module: 'sale' } },
    { path: '/sales', redirect: '/journal' },
    { path: '/journal', component: Journal, meta: { any: ['journal', 'sales'] } },
    { path: '/rank', component: Rank, meta: { module: 'rank' } },
    { path: '/owner', component: OwnerHome, meta: { module: 'home' } },
    { path: '/owner/review', component: Review, meta: { module: 'review' } },
    { path: '/owner/journal', redirect: '/journal' },
    { path: '/owner/team', component: Team, meta: { module: 'team' } },
    { path: '/owner/team/:id', component: Employee, meta: { module: 'team' } },
    { path: '/owner/plans', component: Plans, meta: { module: 'plans' } },
    { path: '/owner/kpi', component: Kpi, meta: { module: 'kpi' } },
    { path: '/owner/access', component: Access, meta: { module: 'access' } },
  ],
})

router.beforeEach((to) => {
  const user = getUser()
  if (to.path === '/login') {
    if (!user) return true
    return user.role === 'seller' ? '/' : '/owner'
  }
  if (!user) return '/login'
  if (to.path === '/' && user.role !== 'seller') return '/owner'
  if (to.meta.any && !to.meta.any.some((m) => can(m))) return user.role === 'seller' ? '/' : '/owner'
  if (to.meta.module && !can(to.meta.module)) return user.role === 'seller' ? '/' : '/owner'
  return true
})

createApp(App).use(router).mount('#app')
