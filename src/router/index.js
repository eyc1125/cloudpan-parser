import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/user/login'
  },
  {
    path: '/user/login',
    name: 'UserLogin',
    component: () => import('../views/login/UserLogin.vue'),
    meta: { title: '用户登录', requiresAuth: false }
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/login/AdminLogin.vue'),
    meta: { title: '管理员登录', requiresAuth: false }
  },
  {
    path: '/user',
    name: 'UserLayout',
    component: () => import('../layouts/UserLayout.vue'),
    meta: { requiresAuth: true, role: 'user' },
    children: [
      {
        path: '',
        redirect: '/user/dashboard'
      },
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: () => import('../views/user/Dashboard.vue'),
        meta: { title: '首页', icon: 'home' }
      },
      {
        path: 'parse',
        name: 'UserParse',
        component: () => import('../views/user/Parse.vue'),
        meta: { title: '智能解析', icon: 'link' }
      },
      {
        path: 'upload',
        name: 'UserUpload',
        component: () => import('../views/user/Upload.vue'),
        meta: { title: '文件上传', icon: 'upload' }
      },
      {
        path: 'ai',
        name: 'UserAI',
        component: () => import('../views/user/AI.vue'),
        meta: { title: 'AI助手', icon: 'robot' }
      },
      {
        path: 'history',
        name: 'UserHistory',
        component: () => import('../views/user/History.vue'),
        meta: { title: '历史记录', icon: 'history' }
      },
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('../views/user/Profile.vue'),
        meta: { title: '个人中心', icon: 'user' }
      }
    ]
  },
  {
    path: '/admin',
    name: 'AdminLayout',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'dashboard' }
      },
      {
        path: 'accounts',
        name: 'AdminAccounts',
        component: () => import('../views/admin/Accounts.vue'),
        meta: { title: '账号管理', icon: 'users' }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue'),
        meta: { title: '用户管理', icon: 'user' }
      },
      {
        path: 'logs',
        name: 'AdminLogs',
        component: () => import('../views/admin/Logs.vue'),
        meta: { title: '操作日志', icon: 'file-text' }
      },
      {
        path: 'stats',
        name: 'AdminStats',
        component: () => import('../views/admin/Stats.vue'),
        meta: { title: '统计分析', icon: 'bar-chart' }
      },
      {
        path: 'files',
        name: 'AdminFiles',
        component: () => import('../views/admin/Files.vue'),
        meta: { title: '文件管理', icon: 'folder' }
      },
      {
        path: 'ai',
        name: 'AdminAI',
        component: () => import('../views/admin/AI.vue'),
        meta: { title: 'AI管理', icon: 'robot' }
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/admin/Settings.vue'),
        meta: { title: '系统设置', icon: 'settings' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  const title = to.meta.title ? `${to.meta.title} - 云盘直链解析平台` : '云盘直链解析平台'
  document.title = title

  if (to.meta.requiresAuth) {
    if (!token) {
      if (to.meta.role === 'admin') {
        next('/admin/login')
      } else {
        next('/user/login')
      }
    } else if (to.meta.role && userRole !== to.meta.role) {
      if (userRole === 'admin') {
        next('/admin/dashboard')
      } else {
        next('/user/dashboard')
      }
    } else {
      next()
    }
  } else {
    if (token && (to.path === '/user/login' || to.path === '/admin/login')) {
      if (userRole === 'admin') {
        next('/admin/dashboard')
      } else {
        next('/user/dashboard')
      }
    } else {
      next()
    }
  }
})

export default router
