<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <input v-model="searchKeyword" type="text" placeholder="搜索日志..." 
                 class="neon-input pl-10 w-64">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
        </div>
        <select v-model="actionFilter" class="neon-input w-40">
          <option value="">全部操作</option>
          <option value="login">登录</option>
          <option value="admin_login">管理员登录</option>
          <option value="create_accounts">创建账号</option>
          <option value="upload">文件上传</option>
          <option value="parse">链接解析</option>
        </select>
      </div>
      <button class="px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm"
              @click="loadLogs">
        🔄 刷新
      </button>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">操作类型</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">账号</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">IP地址</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">详情</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <span class="inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                      :class="getLogClass(log.action_type)">
                  <span>{{ getLogIcon(log.action_type) }}</span>
                  {{ getLogText(log.action_type) }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/70">{{ log.account_code || '系统' }}</td>
              <td class="p-4 text-sm text-white/50 font-mono">{{ log.ip_address || '-' }}</td>
              <td class="p-4 text-sm text-white/60 max-w-xs truncate">{{ log.action_detail || '-' }}</td>
              <td class="p-4 text-sm text-white/50">{{ formatTime(log.created_at) }}</td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="5" class="p-12 text-center text-white/40">
                暂无日志记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="p-4 border-t border-white/10 flex items-center justify-between">
        <p class="text-sm text-white/50">共 {{ total }} 条记录</p>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page <= 1" @click="page--; loadLogs()">
            上一页
          </button>
          <span class="text-sm text-white/60">{{ page }} / {{ totalPages }}</span>
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page >= totalPages" @click="page++; loadLogs()">
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../../utils/api'

const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 50
const searchKeyword = ref('')
const actionFilter = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

function getLogIcon(action) {
  const icons = {
    login: '🔐',
    admin_login: '👑',
    create_accounts: '➕',
    upload: '📤',
    parse: '🔗'
  }
  return icons[action] || '📝'
}

function getLogClass(action) {
  const classes = {
    login: 'bg-blue-500/20 text-blue-400',
    admin_login: 'bg-purple-500/20 text-purple-400',
    create_accounts: 'bg-green-500/20 text-green-400',
    upload: 'bg-pink-500/20 text-pink-400',
    parse: 'bg-cyan-500/20 text-cyan-400'
  }
  return classes[action] || 'bg-white/10 text-white/60'
}

function getLogText(action) {
  const texts = {
    login: '用户登录',
    admin_login: '管理员登录',
    create_accounts: '创建账号',
    upload: '文件上传',
    parse: '链接解析'
  }
  return texts[action] || action
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

async function loadLogs() {
  try {
    const res = await api.get(`/dashboard/recent-logs?limit=${pageSize}`)
    if (res.success) {
      logs.value = res.data
      total.value = res.data.length
    }
  } catch (e) {
    console.error('加载日志失败:', e)
  }
}

let searchTimer = null
watch([searchKeyword, actionFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadLogs()
  }, 300)
})

onMounted(() => {
  loadLogs()
})
</script>
