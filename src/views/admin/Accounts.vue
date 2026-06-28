<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <input v-model="searchKeyword" type="text" placeholder="搜索账号..." 
                 class="neon-input pl-10 w-64">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
        </div>
        <select v-model="statusFilter" class="neon-input w-36">
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="disabled">已禁用</option>
          <option value="expired">已过期</option>
        </select>
      </div>
      <button class="neon-btn flex items-center gap-2" @click="showCreateModal = true">
        <span>➕</span> 创建账号
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card p-4">
        <p class="text-2xl font-bold text-white">{{ accountStats.total || 0 }}</p>
        <p class="text-sm text-white/50">总账号数</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-2xl font-bold text-green-400">{{ accountStats.active || 0 }}</p>
        <p class="text-sm text-white/50">活跃账号</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-2xl font-bold text-red-400">{{ accountStats.expired || 0 }}</p>
        <p class="text-sm text-white/50">已过期/禁用</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-2xl font-bold text-cyan-400">{{ accountStats.todayCreated || 0 }}</p>
        <p class="text-sm text-white/50">今日新增</p>
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">账号</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">密码</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">状态</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">过期时间</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">使用次数</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">创建时间</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <span class="font-mono text-cyan-400 font-medium">{{ account.account_code }}</span>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-white/80">{{ showPasswords[account.id] ? account.password : '••••••••' }}</span>
                  <button class="text-white/40 hover:text-white/60 text-sm" 
                          @click="togglePassword(account.id)">
                    {{ showPasswords[account.id] ? '🙈' : '👁️' }}
                  </button>
                  <button class="text-white/40 hover:text-cyan-400 text-sm"
                          @click="copyText(account.password)">
                    📋
                  </button>
                </div>
              </td>
              <td class="p-4">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      :class="getStatusClass(account)">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(account)"></span>
                  {{ getStatusText(account) }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/70">
                {{ formatDate(account.expires_at) }}
                <div v-if="account.expires_at > Date.now()" class="text-xs text-white/40">
                  剩余 {{ getRemainingDays(account.expires_at) }} 天
                </div>
              </td>
              <td class="p-4 text-sm text-white/70">{{ account.total_usage_count || 0 }}</td>
              <td class="p-4 text-sm text-white/50">{{ formatDate(account.created_at) }}</td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <button class="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                          @click="openExtendModal(account)">
                    续期
                  </button>
                  <button v-if="account.status === 'active'"
                          class="text-xs px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                          @click="toggleAccountStatus(account, 'disabled')">
                    禁用
                  </button>
                  <button v-else
                          class="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          @click="toggleAccountStatus(account, 'active')">
                    启用
                  </button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          @click="deleteAccount(account)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="accounts.length === 0">
              <td colspan="7" class="p-12 text-center text-white/40">
                暂无账号数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="p-4 border-t border-white/10 flex items-center justify-between">
        <p class="text-sm text-white/50">共 {{ total }} 条记录</p>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page <= 1" @click="page--; loadAccounts()">
            上一页
          </button>
          <span class="text-sm text-white/60">{{ page }} / {{ totalPages }}</span>
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page >= totalPages" @click="page++; loadAccounts()">
            下一页
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-card w-full max-w-md p-6">
        <h3 class="text-xl font-bold text-white mb-6">创建账号</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-white/70 mb-2">创建数量</label>
            <input v-model.number="createForm.count" type="number" min="1" max="100" 
                   class="neon-input" placeholder="请输入数量">
          </div>
          
          <div>
            <label class="block text-sm text-white/70 mb-2">有效期</label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-white/50 mb-1 block">天数</label>
                <input v-model.number="createForm.durationDays" type="number" min="1" 
                       class="neon-input" placeholder="天数">
              </div>
              <div>
                <label class="text-xs text-white/50 mb-1 block">月数</label>
                <input v-model.number="createForm.durationMonths" type="number" min="0" 
                       class="neon-input" placeholder="月数">
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <button v-for="preset in durationPresets" :key="preset.label"
                      class="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                      @click="applyDurationPreset(preset)">
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 mt-8">
          <button class="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                  @click="showCreateModal = false">
            取消
          </button>
          <button class="flex-1 neon-btn" @click="handleCreateAccounts" :disabled="creating">
            {{ creating ? '创建中...' : '确认创建' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showExtendModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-card w-full max-w-md p-6">
        <h3 class="text-xl font-bold text-white mb-2">账号续期</h3>
        <p class="text-sm text-white/50 mb-6">账号：{{ currentAccount?.account_code }}</p>
        
        <div>
          <label class="block text-sm text-white/70 mb-2">延长天数</label>
          <input v-model.number="extendDays" type="number" min="1" 
                 class="neon-input" placeholder="请输入延长天数">
        </div>
        
        <div class="flex gap-3 mt-8">
          <button class="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                  @click="showExtendModal = false">
            取消
          </button>
          <button class="flex-1 neon-btn" @click="handleExtend" :disabled="extending">
            {{ extending ? '处理中...' : '确认续期' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showResultModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-card w-full max-w-lg p-6 max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">创建成功</h3>
          <button class="text-white/40 hover:text-white/60" @click="showResultModal = false">✕</button>
        </div>
        
        <p class="text-sm text-white/60 mb-4">成功创建 {{ createdAccounts.length }} 个账号，请妥善保存：</p>
        
        <div class="space-y-2">
          <div v-for="acc in createdAccounts" :key="acc.id"
               class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <p class="font-mono text-cyan-400 text-sm">账号：{{ acc.accountCode }}</p>
              <p class="font-mono text-white/70 text-xs mt-1">密码：{{ acc.password }}</p>
            </div>
            <button class="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    @click="copyAccount(acc)">
              复制
            </button>
          </div>
        </div>
        
        <button class="w-full neon-btn mt-6" @click="copyAllAccounts">
          一键复制全部
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../../utils/api'

const accounts = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const searchKeyword = ref('')
const statusFilter = ref('')
const accountStats = ref({})
const showPasswords = ref({})

const showCreateModal = ref(false)
const showExtendModal = ref(false)
const showResultModal = ref(false)
const creating = ref(false)
const extending = ref(false)
const currentAccount = ref(null)
const extendDays = ref(30)
const createdAccounts = ref([])

const createForm = ref({
  count: 1,
  durationDays: 30,
  durationMonths: 0
})

const durationPresets = [
  { label: '1天', days: 1, months: 0 },
  { label: '7天', days: 7, months: 0 },
  { label: '30天', days: 30, months: 0 },
  { label: '3个月', days: 0, months: 3 },
  { label: '6个月', days: 0, months: 6 },
  { label: '1年', days: 0, months: 12 },
  { label: '2年', days: 0, months: 24 }
]

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

function getStatusClass(account) {
  if (account.status !== 'active') return 'bg-red-500/20 text-red-400'
  if (account.expires_at < Date.now()) return 'bg-orange-500/20 text-orange-400'
  return 'bg-green-500/20 text-green-400'
}

function getStatusDotClass(account) {
  if (account.status !== 'active') return 'bg-red-400'
  if (account.expires_at < Date.now()) return 'bg-orange-400'
  return 'bg-green-400 animate-pulse'
}

function getStatusText(account) {
  if (account.status !== 'active') return '已禁用'
  if (account.expires_at < Date.now()) return '已过期'
  return '活跃'
}

function formatDate(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getRemainingDays(expiresAt) {
  const diff = expiresAt - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function togglePassword(id) {
  showPasswords.value[id] = !showPasswords.value[id]
}

function copyText(text) {
  navigator.clipboard.writeText(text)
}

function applyDurationPreset(preset) {
  createForm.value.durationDays = preset.days
  createForm.value.durationMonths = preset.months
}

async function loadAccounts() {
  try {
    let url = `/accounts?page=${page.value}&pageSize=${pageSize}`
    if (statusFilter.value) url += `&status=${statusFilter.value}`
    if (searchKeyword.value) url += `&keyword=${encodeURIComponent(searchKeyword.value)}`
    
    const res = await api.get(url)
    if (res.success) {
      accounts.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载账号失败:', e)
  }
}

async function loadStats() {
  try {
    const res = await api.get('/accounts/stats')
    if (res.success) {
      accountStats.value = res.data
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

async function handleCreateAccounts() {
  if (createForm.value.count < 1) {
    alert('请输入有效的创建数量')
    return
  }
  
  creating.value = true
  try {
    const res = await api.post('/accounts', {
      count: createForm.value.count,
      durationDays: createForm.value.durationDays || undefined,
      durationMonths: createForm.value.durationMonths || undefined
    })
    
    if (res.success) {
      createdAccounts.value = res.data.accounts
      showCreateModal.value = false
      showResultModal.value = true
      loadAccounts()
      loadStats()
    } else {
      alert(res.message || '创建失败')
    }
  } catch (e) {
    alert('创建失败: ' + e.message)
  } finally {
    creating.value = false
  }
}

function copyAccount(acc) {
  const text = `账号：${acc.accountCode}\n密码：${acc.password}`
  navigator.clipboard.writeText(text)
}

function copyAllAccounts() {
  const text = createdAccounts.value.map(acc => 
    `账号：${acc.accountCode}  密码：${acc.password}`
  ).join('\n')
  navigator.clipboard.writeText(text)
  alert('已复制全部账号信息')
}

function openExtendModal(account) {
  currentAccount.value = account
  extendDays.value = 30
  showExtendModal.value = true
}

async function handleExtend() {
  if (!currentAccount.value || extendDays.value < 1) return
  
  extending.value = true
  try {
    const res = await api.put(`/accounts/${currentAccount.value.id}`, {
      extendDays: extendDays.value
    })
    
    if (res.success) {
      showExtendModal.value = false
      loadAccounts()
    } else {
      alert(res.message || '续期失败')
    }
  } catch (e) {
    alert('续期失败: ' + e.message)
  } finally {
    extending.value = false
  }
}

async function toggleAccountStatus(account, status) {
  try {
    const res = await api.put(`/accounts/${account.id}`, { status })
    if (res.success) {
      loadAccounts()
    }
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

async function deleteAccount(account) {
  if (!confirm(`确定要删除账号 ${account.account_code} 吗？`)) return
  
  try {
    const res = await api.delete(`/accounts/${account.id}`)
    if (res.success) {
      loadAccounts()
      loadStats()
    }
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

let searchTimer = null
watch([searchKeyword, statusFilter], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadAccounts()
  }, 300)
})

onMounted(() => {
  loadAccounts()
  loadStats()
})
</script>
