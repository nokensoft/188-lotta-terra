import { createRouter, createWebHistory } from 'vue-router'
import VisitorView from '../views/VisitorView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'visitor-home',
      component: VisitorView,
    },
    {
      path: '/nokenpanel/dashboard',
      name: 'nokenpanel-dashboard',
      component: DashboardView,
    },
    {
      path: '/nokenpanel',
      redirect: '/nokenpanel/dashboard',
    },
  ],
})

export default router
