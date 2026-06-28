<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="stat in stats" :key="stat.label" class="glass-card p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
             :style="{ background: stat.color }"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-4">
            <span class="text-3xl">{{ stat.icon }}</span>
            <span class="text-xs px-2 py-1 rounded-full"
                  :class="stat.trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
              {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%
            </span>
          </div>
          <p class="text-3xl font-bold text-white mb-1">{{ formatNumber(stat.value) }}</p>
          <p class="text-sm text-white/60">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 glass-card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold text-white">解析趋势</h3>
            <p class="text-sm text-white/50">最近7天解析数据统计</p>
          </div>
          <select v-model="trendDays" class="neon-input text-sm w-32">
            <option :value="7">最近7天</option>
            <option :value="14">最近14天</option>
            <option :value="30">最近30天</option>
          </select>
        </div>
        <div ref="trendChart" class="h-72"></div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-2">平台分布</h3>
        <p class="text-sm text-white/50 mb-6">各平台解析占比</p>
        <div ref="platformChart" class="h-72"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold text-white">实时操作日志</h3>
            <p class="text-sm text-white/50">最新20条操作记录</p>
          </div>
          <span class="flex items-center gap-2 text-xs text-green-400">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            实时更新
          </span>
        </div>
        <div class="space-y-3 max-h-80 overflow-y-auto">
          <div v-for="log in recentLogs" :key="log.id" 
               class="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                 :class="getLogIconClass(log.action_type)">
              {{ getLogIcon(log.action_type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ getLogActionText(log.action_type) }}</p>
              <p class="text-xs text-white/50">{{ log.account_code || '系统' }} · {{ formatTime(log.created_at) }}</p>
            </div>
          </div>
          <div v-if="recentLogs.length === 0" class="text-center py-8 text-white/40">
            暂无日志记录
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-2">快捷操作</h3>
        <p class="text-sm text-white/50 mb-6">常用功能快速入口</p>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="action in quickActions" :key="action.label"
               class="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all group"
               @click="handleQuickAction(action.action)">
            <div class="text-2xl mb-2 group-hover:scale-110 transition-transform">{{ action.icon }}</div>
            <p class="text-sm font-medium text-white">{{ action.label }}</p>
            <p class="text-xs text-white/50 mt-1">{{ action.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { api } from '../../utils/api'

const stats = ref([
  { label: '总账号数', value: 0, icon: '👥', color: '#00d4ff', trend: 0 },
  { label: '活跃账号', value: 0, icon: '✅', color: '#10b981', trend: 0 },
  { label: '今日解析', value: 0, icon: '🔗', color: '#a855f7', trend: 0 },
  { label: '今日上传', value: 0, icon: '📤', color: '#ec4899', trend: 0 }
])

const trendDays = ref(7)
const trendChart = ref(null)
const platformChart = ref(null)
const recentLogs = ref([])

let trendChartInstance = null
let platformChartInstance = null
let logTimer = null

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatTime(ts) {
  const date = new Date(ts)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

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

function getLogIconClass(action) {
  const classes = {
    login: 'bg-blue-500/20 text-blue-400',
    admin_login: 'bg-purple-500/20 text-purple-400',
    create_accounts: 'bg-green-500/20 text-green-400',
    upload: 'bg-pink-500/20 text-pink-400',
    parse: 'bg-cyan-500/20 text-cyan-400'
  }
  return classes[action] || 'bg-white/10 text-white/60'
}

function getLogActionText(action) {
  const texts = {
    login: '用户登录',
    admin_login: '管理员登录',
    create_accounts: '创建账号',
    upload: '文件上传',
    parse: '链接解析'
  }
  return texts[action] || action
}

const quickActions = [
  { icon: '➕', label: '创建账号', desc: '批量生成用户账号', action: 'create-account' },
  { icon: '👥', label: '账号管理', desc: '查看所有账号', action: 'accounts' },
  { icon: '📊', label: '统计分析', desc: '深入数据分析', action: 'stats' },
  { icon: '⚙️', label: '系统设置', desc: '配置系统参数', action: 'settings' }
]

function handleQuickAction(action) {
  const routes = {
    'create-account': '/admin/accounts',
    'accounts': '/admin/accounts',
    'stats': '/admin/stats',
    'settings': '/admin/settings'
  }
  if (routes[action]) {
    window.location.hash = '#' + routes[action]
  }
}

async function loadStats() {
  try {
    const res = await api.get('/dashboard/stats')
    if (res.success) {
      stats.value[0].value = res.data.totalAccounts
      stats.value[1].value = res.data.activeAccounts
      stats.value[2].value = res.data.todayParses
      stats.value[3].value = res.data.todayUploads
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

async function loadTrend() {
  try {
    const res = await api.get(`/dashboard/trend?days=${trendDays.value}`)
    if (res.success && trendChartInstance) {
      const dates = res.data.map(d => d.date)
      const parses = res.data.map(d => d.parses)
      const uploads = res.data.map(d => d.uploads)
      
      trendChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(20, 20, 40, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#fff' }
        },
        legend: {
          data: ['解析次数', '上传次数'],
          textStyle: { color: 'rgba(255,255,255,0.6)' },
          top: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: 'rgba(255,255,255,0.5)' }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
          axisLabel: { color: 'rgba(255,255,255,0.5)' }
        },
        series: [
          {
            name: '解析次数',
            type: 'line',
            smooth: true,
            data: parses,
            itemStyle: { color: '#00d4ff' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0)' }
              ])
            }
          },
          {
            name: '上传次数',
            type: 'line',
            smooth: true,
            data: uploads,
            itemStyle: { color: '#a855f7' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0)' }
              ])
            }
          }
        ]
      })
    }
  } catch (e) {
    console.error('加载趋势失败:', e)
  }
}

async function loadPlatforms() {
  try {
    const res = await api.get('/dashboard/platforms')
    if (res.success && platformChartInstance) {
      const data = res.data.map(item => ({
        value: item.count,
        name: item.name
      }))
      
      platformChartInstance.setOption({
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(20, 20, 40, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#fff' }
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          textStyle: { color: 'rgba(255,255,255,0.6)' }
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'rgba(10, 10, 26, 1)',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#fff'
            }
          },
          data: data,
          color: ['#00d4ff', '#a855f7', '#ec4899', '#10b981', '#fbbf24', '#f97316']
        }]
      })
    }
  } catch (e) {
    console.error('加载平台分布失败:', e)
  }
}

async function loadRecentLogs() {
  try {
    const res = await api.get('/dashboard/recent-logs?limit=20')
    if (res.success) {
      recentLogs.value = res.data
    }
  } catch (e) {
    console.error('加载日志失败:', e)
  }
}

watch(trendDays, () => {
  loadTrend()
})

onMounted(() => {
  loadStats()
  loadRecentLogs()
  
  if (trendChart.value) {
    trendChartInstance = echarts.init(trendChart.value)
    loadTrend()
  }
  
  if (platformChart.value) {
    platformChartInstance = echarts.init(platformChart.value)
    loadPlatforms()
  }
  
  logTimer = setInterval(() => {
    loadRecentLogs()
    loadStats()
  }, 30000)
  
  window.addEventListener('resize', () => {
    trendChartInstance?.resize()
    platformChartInstance?.resize()
  })
})

onUnmounted(() => {
  clearInterval(logTimer)
  trendChartInstance?.dispose()
  platformChartInstance?.dispose()
  window.removeEventListener('resize', () => {})
})
</script>
