<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <div class="flex gap-2">
        <button v-for="tab in tabs" :key="tab.key"
                class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                :class="activeTab === tab.key ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'"
                @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>
      <div class="flex-1"></div>
      <div class="relative">
        <input v-model="searchKeyword" type="text" placeholder="搜索..." 
               class="neon-input pl-10 w-48 text-sm">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div v-if="activeTab === 'parse'" class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">平台</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">文件名/链接</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">状态</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">时间</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in parseRecords" :key="item.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <span class="inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                      :class="getPlatformClass(item.platform_type)">
                  {{ getPlatformIcon(item.platform_type) }}
                  {{ getPlatformName(item.platform_type) }}
                </span>
              </td>
              <td class="p-4 text-sm text-white truncate max-w-xs">
                {{ item.file_name || item.share_link }}
              </td>
              <td class="p-4">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      :class="item.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                  {{ item.success ? '成功' : '失败' }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/50">{{ formatTime(item.created_at) }}</td>
              <td class="p-4">
                <button v-if="item.success && item.direct_url"
                        class="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        @click="copyUrl(item.direct_url)">
                  复制链接
                </button>
              </td>
            </tr>
            <tr v-if="parseRecords.length === 0">
              <td colspan="5" class="p-12 text-center text-white/40">
                暂无解析记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">文件名</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">类型</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">大小</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">上传时间</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in uploadRecords" :key="item.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <span class="text-xl">{{ getFileIcon(item.file_type) }}</span>
                  <span class="text-sm text-white truncate max-w-xs">{{ item.file_name }}</span>
                </div>
              </td>
              <td class="p-4">
                <span class="px-2 py-1 rounded-full text-xs"
                      :class="getTypeClass(item.file_type)">
                  {{ getTypeName(item.file_type) }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/70">{{ formatSize(item.file_size) }}</td>
              <td class="p-4 text-sm text-white/50">{{ formatTime(item.created_at) }}</td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <button class="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                          @click="copyUrl(item.direct_url)">
                    复制链接
                  </button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          @click="deleteUpload(item)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="uploadRecords.length === 0">
              <td colspan="5" class="p-12 text-center text-white/40">
                暂无上传记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-4 border-t border-white/10 flex items-center justify-between">
        <p class="text-sm text-white/50">共 {{ total }} 条记录</p>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page <= 1" @click="page--; loadData()">
            上一页
          </button>
          <span class="text-sm text-white/60">{{ page }} / {{ totalPages }}</span>
          <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
                  :disabled="page >= totalPages" @click="page++; loadData()">
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../../utils/api'

const activeTab = ref('parse')
const parseRecords = ref([])
const uploadRecords = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const searchKeyword = ref('')

const tabs = [
  { key: 'parse', label: '🔗 解析记录' },
  { key: 'upload', label: '📤 上传记录' }
]

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

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

function getPlatformName(platform) {
  const names = {
    tianyi: '天翼云盘',
    baidu: '百度网盘',
    aliyun: '阿里云盘',
    quark: '夸克网盘',
    douyin: '抖音',
    kuaishou: '快手',
    bilibili: 'B站'
  }
  return names[platform] || platform
}

function getPlatformClass(platform) {
  const classes = {
    tianyi: 'bg-blue-500/20 text-blue-400',
    baidu: 'bg-sky-500/20 text-sky-400',
    aliyun: 'bg-orange-500/20 text-orange-400',
    quark: 'bg-purple-500/20 text-purple-400',
    douyin: 'bg-pink-500/20 text-pink-400',
    kuaishou: 'bg-yellow-500/20 text-yellow-400',
    bilibili: 'bg-cyan-500/20 text-cyan-400'
  }
  return classes[platform] || 'bg-white/10 text-white/60'
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

function getTypeName(type) {
  const names = {
    image: '图片',
    video: '视频',
    audio: '音频',
    document: '文档',
    archive: '压缩包',
    other: '其他'
  }
  return names[type] || type
}

function getTypeClass(type) {
  const classes = {
    image: 'bg-blue-500/20 text-blue-400',
    video: 'bg-purple-500/20 text-purple-400',
    audio: 'bg-green-500/20 text-green-400',
    document: 'bg-yellow-500/20 text-yellow-400',
    archive: 'bg-orange-500/20 text-orange-400',
    other: 'bg-white/10 text-white/60'
  }
  return classes[type] || 'bg-white/10 text-white/60'
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
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function copyUrl(url) {
  const fullUrl = window.location.origin + url
  navigator.clipboard.writeText(fullUrl)
}

async function deleteUpload(item) {
  if (!confirm(`确定要删除 ${item.file_name} 吗？`)) return
  
  try {
    const res = await api.delete(`/upload/${item.id}`)
    if (res.success) {
      loadData()
    }
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

async function loadData() {
  try {
    const res = await api.get(`/user/parse-history?type=${activeTab.value}&page=${page.value}&pageSize=${pageSize}`)
    if (res.success) {
      if (activeTab.value === 'parse') {
        parseRecords.value = res.data.list
      } else {
        uploadRecords.value = res.data.list
      }
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载历史失败:', e)
  }
}

watch(activeTab, () => {
  page.value = 1
  loadData()
})

onMounted(() => {
  loadData()
})
</script>
