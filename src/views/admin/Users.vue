<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="relative">
        <input v-model="searchKeyword" type="text" placeholder="搜索用户..." 
               class="neon-input pl-10 w-64">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">用户名</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">角色</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">状态</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">最后登录</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                    <span class="text-white text-sm font-bold">{{ user.username?.charAt(0)?.toUpperCase() || 'U' }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-white">{{ user.username }}</p>
                    <p class="text-xs text-white/50">{{ user.account_code || '-' }}</p>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <span class="px-2 py-1 rounded-full text-xs"
                      :class="user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'">
                  {{ user.role === 'admin' ? '管理员' : '用户' }}
                </span>
              </td>
              <td class="p-4">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      :class="user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                  <span class="w-1.5 h-1.5 rounded-full" 
                        :class="user.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'"></span>
                  {{ user.status === 'active' ? '活跃' : '禁用' }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/70">{{ formatDate(user.last_login_at) }}</td>
              <td class="p-4 text-sm text-white/50">{{ formatDate(user.created_at) }}</td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="p-12 text-center text-white/40">
                暂无用户数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../utils/api'

const users = ref([])
const searchKeyword = ref('')

function formatDate(ts) {
  if (!ts) return '从未登录'
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  users.value = [
    { id: '1', username: 'admin', role: 'admin', status: 'active', last_login_at: Date.now(), created_at: Date.now() - 86400000 * 30 }
  ]
})
</script>
