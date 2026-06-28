<template>
  <div class="space-y-6">
    <div class="glass-card p-8">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
          <span class="text-4xl text-white font-bold">{{ userInitial }}</span>
        </div>
        <div class="flex-1 text-center md:text-left">
          <h2 class="text-2xl font-bold text-white mb-1">{{ userStore.userInfo.accountCode || '用户' }}</h2>
          <p class="text-white/50 mb-4">普通用户</p>
          <div class="flex flex-wrap gap-3 justify-center md:justify-start">
            <span class="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              账号正常
            </span>
            <span class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
              剩余 {{ remainingDays }} 天
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card p-6 text-center">
        <p class="text-4xl font-bold text-cyan-400 mb-2">{{ stats.totalParses || 0 }}</p>
        <p class="text-sm text-white/50">总解析次数</p>
      </div>
      <div class="glass-card p-6 text-center">
        <p class="text-4xl font-bold text-purple-400 mb-2">{{ stats.totalUploads || 0 }}</p>
        <p class="text-sm text-white/50">总上传次数</p>
      </div>
      <div class="glass-card p-6 text-center">
        <p class="text-4xl font-bold text-pink-400 mb-2">{{ formatSize(stats.totalUploadSize || 0) }}</p>
        <p class="text-sm text-white/50">总上传大小</p>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-6">账号信息</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <span class="text-white/70">账号</span>
          <span class="text-white font-mono">{{ userStore.userInfo.accountCode || '-' }}</span>
        </div>
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <span class="text-white/70">注册时间</span>
          <span class="text-white/80">{{ formatDate(accountInfo.created_at) }}</span>
        </div>
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <span class="text-white/70">最后使用</span>
          <span class="text-white/80">{{ formatDate(accountInfo.last_used_at) }}</span>
        </div>
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <span class="text-white/70">过期时间</span>
          <span class="text-white/80">{{ formatDate(accountInfo.expires_at) }}</span>
        </div>
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <span class="text-white/70">使用次数</span>
          <span class="text-white/80">{{ accountInfo.total_usage_count || 0 }} 次</span>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-6">主题设置</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="theme in themes" :key="theme.id"
             class="p-4 rounded-xl cursor-pointer border-2 transition-all"
             :class="currentTheme === theme.id ? 'border-cyan-500' : 'border-transparent bg-white/5 hover:bg-white/10'"
             @click="changeTheme(theme.id)">
          <div class="h-16 rounded-lg mb-3" :style="{ background: theme.preview }"></div>
          <p class="text-sm font-medium text-white text-center">{{ theme.name }}</p>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-6">操作</h3>
      
      <div class="space-y-3">
        <button class="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors flex items-center justify-between group">
          <div class="flex items-center gap-3">
            <span class="text-xl">🔐</span>
            <span class="text-white">修改密码</span>
          </div>
          <span class="text-white/40 group-hover:text-white/60">→</span>
        </button>
        <button class="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors flex items-center justify-between group">
          <div class="flex items-center gap-3">
            <span class="text-xl">📋</span>
            <span class="text-white">我的收藏</span>
          </div>
          <span class="text-white/40 group-hover:text-white/60">→</span>
        </button>
        <button class="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-left transition-colors flex items-center justify-between group"
                @click="handleLogout">
          <div class="flex items-center gap-3">
            <span class="text-xl">🚪</span>
            <span class="text-red-400">退出登录</span>
          </div>
          <span class="text-red-400/60 group-hover:text-red-400">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'
import { api } from '../../utils/api'

const router = useRouter()
const userStore = useUserStore()

const stats = ref({
  totalParses: 0,
  totalUploads: 0,
  totalUploadSize: 0
})

const accountInfo = ref({})
const currentTheme = ref('deep-space')

const themes = [
  { id: 'deep-space', name: '深空科技', preview: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #2d1b69 100%)' },
  { id: 'ocean-blue', name: '深海蓝调', preview: 'linear-gradient(135deg, #0c1929 0%, #163152 50%, #1e4a7a 100%)' },
  { id: 'forest-green', name: '森林绿意', preview: 'linear-gradient(135deg, #0a1a0a 0%, #1a3e1a 50%, #1b692d 100%)' },
  { id: 'sunset-purple', name: '暮光紫霞', preview: 'linear-gradient(135deg, #1a0a1a 0%, #3e1a3e 50%, #691b4a 100%)' }
]

const userInitial = computed(() => {
  const code = userStore.userInfo.accountCode || 'U'
  return code.charAt(0).toUpperCase()
})

const remainingDays = computed(() => {
  const expiresAt = userStore.userInfo.expiresAt
  if (!expiresAt) return 0
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
})

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function changeTheme(id) {
  currentTheme.value = id
}

function handleLogout() {
  if (!confirm('确定要退出登录吗？')) return
  userStore.logout()
  router.push('/user/login')
}

async function loadProfile() {
  try {
    const res = await api.get('/user/profile')
    if (res.success) {
      stats.value = res.data.stats
      accountInfo.value = res.data.account
    }
  } catch (e) {
    console.error('加载资料失败:', e)
  }
}

onMounted(() => {
  loadProfile()
})
</script>
