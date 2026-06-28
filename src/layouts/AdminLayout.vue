<template>
  <div class="min-h-screen flex">
    <aside class="sidebar w-64 fixed left-0 top-0 bottom-0 z-20 flex flex-col">
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <span class="text-xl">⚡</span>
          </div>
          <div>
            <h1 class="text-lg font-bold neon-text">管理后台</h1>
            <p class="text-xs text-white/50">v0.0.02</p>
          </div>
        </div>
      </div>
      
      <nav class="flex-1 p-4 overflow-y-auto">
        <div class="space-y-1">
          <div 
            v-for="item in menuItems" 
            :key="item.path"
            class="sidebar-item"
            :class="{ active: isActive(item.path) }"
            @click="navigateTo(item.path)"
          >
            <span class="text-xl">{{ item.icon }}</span>
            <span class="font-medium">{{ item.label }}</span>
          </div>
        </div>
      </nav>
      
      <div class="p-4 border-t border-white/10">
        <div class="sidebar-item" @click="handleLogout">
          <span class="text-xl">🚪</span>
          <span class="font-medium">退出登录</span>
        </div>
      </div>
    </aside>
    
    <div class="flex-1 ml-64">
      <header class="sticky top-0 z-10 glass border-b border-white/10 px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-white">{{ currentPageTitle }}</h2>
            <p class="text-sm text-white/50">{{ currentPageSubtitle }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <span class="text-white text-sm font-bold">A</span>
              </div>
              <div>
                <p class="text-sm font-medium text-white">管理员</p>
                <p class="text-xs text-white/50">admin</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main class="p-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const menuItems = [
  { path: '/admin/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/admin/accounts', label: '账号管理', icon: '👥' },
  { path: '/admin/users', label: '用户管理', icon: '👤' },
  { path: '/admin/logs', label: '操作日志', icon: '📝' },
  { path: '/admin/stats', label: '统计分析', icon: '📈' },
  { path: '/admin/files', label: '文件管理', icon: '📁' },
  { path: '/admin/ai', label: 'AI管理', icon: '🤖' },
  { path: '/admin/settings', label: '系统设置', icon: '⚙️' }
]

const currentPageTitle = computed(() => {
  const item = menuItems.find(m => route.path.startsWith(m.path))
  return item ? item.label : '仪表盘'
})

const currentPageSubtitle = computed(() => {
  const subtitles = {
    '/admin/dashboard': '实时监控平台运营数据',
    '/admin/accounts': '管理用户账号和访问权限',
    '/admin/users': '查看和管理注册用户',
    '/admin/logs': '查看系统操作日志记录',
    '/admin/stats': '深入分析平台使用数据',
    '/admin/files': '管理用户上传的文件',
    '/admin/ai': '管理AI助手功能配置',
    '/admin/settings': '配置系统参数和选项'
  }
  return subtitles[route.path] || '实时监控平台运营数据'
})

function isActive(path) {
  return route.path.startsWith(path)
}

function navigateTo(path) {
  router.push(path)
}

function handleLogout() {
  userStore.logout()
  router.push('/admin/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
