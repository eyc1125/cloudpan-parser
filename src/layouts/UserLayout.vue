<template>
  <div class="min-h-screen flex">
    <aside class="sidebar w-64 fixed left-0 top-0 bottom-0 z-20 flex flex-col">
      <div class="p-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <span class="text-xl">☁️</span>
          </div>
          <div>
            <h1 class="text-lg font-bold neon-text">云盘解析</h1>
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
        <div class="glass-card p-3 mb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">⏰</span>
            <span class="text-sm text-white/70">剩余时长</span>
          </div>
          <p class="text-lg font-bold text-cyan-400">{{ remainingTime }}</p>
        </div>
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
            <button class="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <span class="text-xl">🔔</span>
            </button>
            <div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <span class="text-white text-sm font-bold">{{ userInitial }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-white">{{ userStore.userInfo.accountCode || '用户' }}</p>
                <p class="text-xs text-green-400">● 在线</p>
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
  { path: '/user/dashboard', label: '首页', icon: '🏠' },
  { path: '/user/parse', label: '智能解析', icon: '🔗' },
  { path: '/user/upload', label: '文件上传', icon: '📤' },
  { path: '/user/ai', label: 'AI助手', icon: '🤖' },
  { path: '/user/history', label: '历史记录', icon: '📜' },
  { path: '/user/profile', label: '个人中心', icon: '👤' }
]

const currentPageTitle = computed(() => {
  const item = menuItems.find(m => route.path.startsWith(m.path))
  return item ? item.label : '首页'
})

const currentPageSubtitle = computed(() => {
  const subtitles = {
    '/user/dashboard': '欢迎使用云盘直链解析平台',
    '/user/parse': '支持多种网盘和短视频链接解析',
    '/user/upload': '上传文件获取永久直链',
    '/user/ai': '智能助手，用自然语言操作',
    '/user/history': '查看你的解析和上传历史',
    '/user/profile': '管理你的账户信息'
  }
  return subtitles[route.path] || '欢迎使用云盘直链解析平台'
})

const userInitial = computed(() => {
  const code = userStore.userInfo.accountCode || 'U'
  return code.charAt(0).toUpperCase()
})

const remainingTime = computed(() => {
  const expiresAt = userStore.userInfo.expiresAt
  if (!expiresAt) return '未知'
  
  const now = Date.now()
  const diff = expiresAt - now
  
  if (diff <= 0) return '已过期'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days}天${hours}小时`
  return `${hours}小时`
})

function isActive(path) {
  return route.path.startsWith(path)
}

function navigateTo(path) {
  router.push(path)
}

function handleLogout() {
  userStore.logout()
  router.push('/user/login')
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
