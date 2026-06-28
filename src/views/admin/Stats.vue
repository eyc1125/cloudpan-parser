<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="glass-card p-6">
        <p class="text-3xl font-bold text-white mb-1">{{ stats.totalParses || 0 }}</p>
        <p class="text-sm text-white/60">总解析次数</p>
      </div>
      <div class="glass-card p-6">
        <p class="text-3xl font-bold text-green-400 mb-1">{{ stats.successRate || 0 }}%</p>
        <p class="text-sm text-white/60">成功率</p>
      </div>
      <div class="glass-card p-6">
        <p class="text-3xl font-bold text-purple-400 mb-1">{{ formatSize(stats.totalUploadSize || 0) }}</p>
        <p class="text-sm text-white/60">总上传大小</p>
      </div>
      <div class="glass-card p-6">
        <p class="text-3xl font-bold text-cyan-400 mb-1">{{ stats.todayAiChats || 0 }}</p>
        <p class="text-sm text-white/60">今日AI对话</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-4">解析趋势</h3>
        <div ref="trendChart" class="h-64"></div>
      </div>
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-4">平台分布</h3>
        <div ref="platformChart" class="h-64"></div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-4">使用排行</h3>
      <div class="space-y-3">
        <div v-for="(item, index) in topUsers" :key="index"
             class="flex items-center gap-4 p-3 rounded-xl bg-white/5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
               :class="index < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-white/10 text-white/60'">
            {{ index + 1 }}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-white">{{ item.account_code || '未知用户' }}</p>
            <div class="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                   :style="{ width: (item.count / maxCount * 100) + '%' }"></div>
            </div>
          </div>
          <p class="text-sm text-white/60">{{ item.count }} 次</p>
        </div>
        <div v-if="topUsers.length === 0" class="text-center py-8 text-white/40">
          暂无数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { api } from '../../utils/api'

const stats = ref({})
const topUsers = ref([])
const trendChart = ref(null)
const platformChart = ref(null)

let trendChartInstance = null
let platformChartInstance = null

const maxCount = computed(() => {
  if (topUsers.value.length === 0) return 1
  return Math.max(...topUsers.value.map(u => u.count))
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

async function loadStats() {
  try {
    const res = await api.get('/dashboard/stats')
    if (res.success) {
      stats.value = res.data
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

async function loadTrend() {
  try {
    const res = await api.get('/dashboard/trend?days=30')
    if (res.success && trendChartInstance) {
      const dates = res.data.map(d => d.date)
      const parses = res.data.map(d => d.parses)
      
      trendChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(20, 20, 40, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#fff' }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
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
        series: [{
          type: 'bar',
          data: parses,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00d4ff' },
              { offset: 1, color: '#a855f7' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }]
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
      const data = res.data.map(item => ({ value: item.count, name: item.name }))
      
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
          itemStyle: {
            borderRadius: 8,
            borderColor: 'rgba(10, 10, 26, 1)',
            borderWidth: 2
          },
          label: { show: false },
          data: data,
          color: ['#00d4ff', '#a855f7', '#ec4899', '#10b981', '#fbbf24', '#f97316']
        }]
      })
    }
  } catch (e) {
    console.error('加载平台分布失败:', e)
  }
}

onMounted(() => {
  loadStats()
  
  if (trendChart.value) {
    trendChartInstance = echarts.init(trendChart.value)
    loadTrend()
  }
  
  if (platformChart.value) {
    platformChartInstance = echarts.init(platformChart.value)
    loadPlatforms()
  }
  
  topUsers.value = [
    { account_code: 'CLOUD123ABC', count: 156 },
    { account_code: 'CLOUD456DEF', count: 128 },
    { account_code: 'CLOUD789GHI', count: 95 },
    { account_code: 'CLOUD012JKL', count: 67 },
    { account_code: 'CLOUD345MNO', count: 42 }
  ]
  
  window.addEventListener('resize', () => {
    trendChartInstance?.resize()
    platformChartInstance?.resize()
  })
})

onUnmounted(() => {
  trendChartInstance?.dispose()
  platformChartInstance?.dispose()
  window.removeEventListener('resize', () => {})
})
</script>
