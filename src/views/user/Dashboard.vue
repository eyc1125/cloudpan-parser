<template>
  <div class="space-y-6">
    <div class="glass-card p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 bg-cyan-500"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-20 bg-purple-500"></div>
      
      <div class="relative">
        <h2 class="text-3xl font-bold text-white mb-2">
          欢迎回来，{{ userStore.userInfo.accountCode || '用户' }} 👋
        </h2>
        <p class="text-white/60 mb-6">
          今天也要加油哦！支持多网盘解析、短视频提取、文件上传直链
        </p>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <p class="text-2xl font-bold text-cyan-400">{{ stats.totalParses || 0 }}</p>
            <p class="text-sm text-white/50">总解析次数</p>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <p class="text-2xl font-bold text-purple-400">{{ stats.totalUploads || 0 }}</p>
            <p class="text-sm text-white/50">总上传次数</p>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <p class="text-2xl font-bold text-pink-400">{{ formatSize(stats.totalUploadSize || 0) }}</p>
            <p class="text-sm text-white/50">总上传大小</p>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <p class="text-2xl font-bold text-green-400">{{ remainingDays }}天</p>
            <p class="text-sm text-white/50">剩余时长</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="tool in tools" :key="tool.path"
           class="glass-card p-6 cursor-pointer group hover:scale-[1.02] transition-all"
           @click="goTo(tool.path)">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform"
             :style="{ background: tool.bg }">
          {{ tool.icon }}
        </div>
        <h3 class="text-lg font-bold text-white mb-2">{{ tool.title }}</h3>
        <p class="text-sm text-white/50 mb-4">{{ tool.desc }}</p>
        <span class="text-sm text-cyan-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          立即使用 →
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">最近解析</h3>
          <button class="text-sm text-cyan-400 hover:text-cyan-300" @click="goTo('/user/history')">
            查看全部
          </button>
        </div>
        <div class="space-y-3">
          <div v-for="item in recentParses" :key="item.id"
               class="p-3 rounded-xl bg-white/5 flex items-center gap-3">
            <span class="text-xl">{{ getPlatformIcon(item.platform_type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ item.file_name || item.share_link }}</p>
              <p class="text-xs text-white/40">{{ formatTime(item.created_at) }}</p>
            </div>
            <span v-if="item.success" class="text-xs text-green-400">成功</span>
            <span v-else class="text-xs text-red-400">失败</span>
          </div>
          <div v-if="recentParses.length === 0" class="text-center py-8 text-white/40">
            暂无解析记录
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">最近上传</h3>
          <button class="text-sm text-cyan-400 hover:text-cyan-300" @click="goTo('/user/history')">
            查看全部
          </button>
        </div>
        <div class="space-y-3">
          <div v-for="item in recentUploads" :key="item.id"
               class="p-3 rounded-xl bg-white/5 flex items-center gap-3">
            <span class="text-xl">{{ getFileIcon(item.file_type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ item.file_name }}</p>
              <p class="text-xs text-white/40">{{ formatSize(item.file_size) }} · {{ formatTime(item.created_at) }}</p>
            </div>
            <button class="text-xs text-cyan-400 hover:text-cyan-300"
                    @click.stop="copyUrl(item.direct_url)">
              复制
            </button>
          </div>
          <div v-if="recentUploads.length === 0" class="text-center py-8 text-white/40">
            暂无上传记录
          </div>
        </div>
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

const recentParses = ref([])
const recentUploads = ref([])

const tools = [
  { icon: '🔗', title: '智能解析', desc: '支持天翼、百度、阿里等多网盘解析', path: '/user/parse', bg: 'linear-gradient(135deg, #00d4ff, #0099cc)' },
  { icon: '📤', title: '文件上传', desc: '上传文件获取永久直链', path: '/user/upload', bg: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  { icon: '🤖', title: 'AI助手', desc: '智能识别链接，一键解析', path: '/user/ai', bg: 'linear-gradient(135deg, #ec4899, #db2777)' },
  { icon: '📜', title: '历史记录', desc: '查看所有解析和上传记录', path: '/user/history', bg: 'linear-gradient(135deg, #10b981, #059669)' },
  { icon: '👤', title: '个人中心', desc: '管理你的账户信息', path: '/user/profile', bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
  { icon: '❓', title: '帮助中心', desc: '常见问题和使用指南', path: '/user/ai', bg: 'linear-gradient(135deg, #f97316, #ea580c)' }
]

const remainingDays = computed(() => {
  const expiresAt = userStore.userInfo.expiresAt
  if (!expiresAt) return 0
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
})

function goTo(path) {
  router.push(path)
}

function getPlatformIcon(platform) {
  const icons = {
    tianyi: '☁️',
    baidu: '🔵',
    aliyun: '🟠',
    quark: '🟣',
    douyin: '🎵',
    kuaishou: '⚡',
    bilibili: '📺'
  }
  return icons[platform] || '🔗'
}

function getFileIcon(type) {
  const icons = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    archive: '📦',
    other: '📁'
  }
  return icons[type] || '📁'
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function copyUrl(url) {
  if (url) navigator.clipboard.writeText(url)
}

async function loadStats() {
  try {
    const res = await api.get('/user/profile')
    if (res.success) {
      stats.value = res.data.stats
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

async function loadRecent() {
  try {
    const res = await api.get('/user/parse-history?pageSize=5')
    if (res.success) {
      recentParses.value = res.data.list.slice(0, 5)
    }
  } catch (e) {
    console.error('加载历史失败:', e)
  }
}

onMounted(() => {
  loadStats()
  loadRecent()
})
</script>
