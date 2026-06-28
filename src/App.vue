<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl floating"></div>
      <div class="absolute top-40 right-20 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl floating" style="animation-delay: 1s"></div>
      <div class="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl floating" style="animation-delay: 2s"></div>
    </div>

    <div class="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
      <header class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          ☁️ 云盘直链解析
        </h1>
        <p class="text-white/80 text-lg">
          支持天翼网盘 · 在线播放 · 高速下载 · 无水印
        </p>
      </header>

      <div class="glass rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
        <div class="flex flex-col md:flex-row gap-4 mb-6">
          <div class="flex-1">
            <input
              v-model="shareUrl"
              type="text"
              placeholder="粘贴分享链接..."
              class="w-full px-6 py-4 rounded-2xl bg-white/20 border border-white/30 text-white placeholder-white/60 text-lg transition-all"
              @keyup.enter="parseLink"
            />
          </div>
          <div class="w-full md:w-32">
            <input
              v-model="accessCode"
              type="text"
              placeholder="访问码"
              class="w-full px-4 py-4 rounded-2xl bg-white/20 border border-white/30 text-white placeholder-white/60 text-center transition-all"
              @keyup.enter="parseLink"
            />
          </div>
          <button
            @click="parseLink"
            :disabled="loading"
            class="btn-glow px-8 py-4 bg-white text-purple-600 font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">解析中...</span>
            <span v-else>🚀 解析</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="text-white/70 text-sm">快捷平台：</span>
          <span class="px-3 py-1 bg-white/20 rounded-full text-white/90 text-sm">天翼网盘</span>
          <span class="px-3 py-1 bg-white/10 rounded-full text-white/50 text-sm">百度网盘 (即将上线)</span>
          <span class="px-3 py-1 bg-white/10 rounded-full text-white/50 text-sm">阿里云盘 (即将上线)</span>
        </div>
      </div>

      <div v-if="error" class="glass rounded-2xl p-6 mb-8 border-red-400/50 border-2 fade-in-up">
        <p class="text-red-200 text-lg">⚠️ {{ error }}</p>
      </div>

      <div v-if="shareInfo && fileList" class="glass rounded-3xl p-6 md:p-8 shadow-2xl fade-in-up">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              ☁️
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">{{ shareInfo.shareName || '分享文件' }}</h2>
              <p class="text-white/70 text-sm">
                {{ shareInfo.nickName || '匿名分享' }}
                <span v-if="shareInfo.createTime">· {{ formatDate(shareInfo.createTime) }}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              v-if="currentPath.length > 1"
              @click="goBack"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
            >
              ← 返回
            </button>
          </div>
        </div>

        <div v-if="breadcrumb.length > 0" class="flex items-center gap-2 mb-6 flex-wrap">
          <button
            @click="navigateTo(-1)"
            class="text-white/80 hover:text-white transition-colors"
          >
            📁 根目录
          </button>
          <span class="text-white/40">/</span>
          <template v-for="(item, index) in breadcrumb" :key="index">
            <button
              @click="navigateTo(index)"
              class="text-white/80 hover:text-white transition-colors"
            >
              {{ item.name }}
            </button>
            <span v-if="index < breadcrumb.length - 1" class="text-white/40">/</span>
          </template>
        </div>

        <div v-if="fileListLoading" class="text-center py-12">
          <div class="inline-block w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
          <p class="text-white/70">加载中...</p>
        </div>

        <div v-else-if="files.length === 0" class="text-center py-12">
          <p class="text-white/50 text-lg">📭 文件夹为空</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="file in files"
            :key="file.fileId || file.id"
            class="card-hover glass rounded-2xl p-5 cursor-pointer group"
            @click="handleFileClick(file)"
          >
            <div class="flex items-start gap-4">
              <div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" :class="getIconBg(file)">
                {{ getFileIcon(file) }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-white font-semibold truncate group-hover:text-blue-200 transition-colors">
                  {{ file.fileName || file.name }}
                </h3>
                <p class="text-white/60 text-sm mt-1">
                  {{ formatFileSize(file.fileSize || file.size) }}
                </p>
                <div v-if="!file.isFolder && canPlay(file)" class="mt-3">
                  <span class="px-2 py-1 bg-green-500/30 text-green-200 text-xs rounded-lg">
                    ▶ 可播放
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentFile && downloadUrl" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closePlayer">
        <div class="glass-dark rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden fade-in-up">
          <div class="flex items-center justify-between p-4 border-b border-white/10">
            <h3 class="text-white font-semibold truncate flex-1">{{ currentFile.fileName || currentFile.name }}</h3>
            <button @click="closePlayer" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-4">
              ✕
            </button>
          </div>

          <div class="aspect-video bg-black relative">
            <video
              v-if="videoUrl"
              ref="videoPlayer"
              :src="videoUrl"
              controls
              playsinline
              class="w-full h-full"
            ></video>
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-white/70">加载视频中...</p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="flex flex-wrap gap-3">
              <a
                :href="downloadUrl"
                target="_blank"
                class="btn-glow flex-1 min-w-[120px] px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl text-center hover:shadow-lg transition-all"
              >
                📥 下载文件
              </a>
              <button
                @click="copyLink"
                class="flex-1 min-w-[120px] px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all"
              >
                {{ copied ? '✅ 已复制' : '📋 复制直链' }}
              </button>
            </div>

            <div class="mt-4 p-4 bg-black/30 rounded-xl">
              <p class="text-white/60 text-sm mb-2">直链地址：</p>
              <p class="text-white/80 text-sm break-all font-mono">{{ downloadUrl }}</p>
            </div>
          </div>
        </div>
      </div>

      <footer class="text-center mt-16 text-white/50 text-sm">
        <p>💡 提示：支持天翼网盘分享链接解析，获取真实直链</p>
        <p class="mt-2">使用 Cloudflare Workers 驱动 · 全球加速</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Hls from 'hls.js'

const shareUrl = ref('')
const accessCode = ref('')
const loading = ref(false)
const error = ref('')
const shareInfo = ref(null)
const fileList = ref(null)
const fileListLoading = ref(false)
const files = ref([])
const currentPath = ref([{ name: '根目录', id: '-11' }])
const currentFile = ref(null)
const downloadUrl = ref('')
const videoUrl = ref('')
const copied = ref(false)
const videoPlayer = ref(null)

const API_BASE = (import.meta.env.VITE_API_URL || '/api')

const breadcrumb = computed(() => currentPath.value.slice(1))

function formatFileSize(bytes) {
  if (!bytes) return '未知大小'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = parseFloat(bytes)
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return size.toFixed(2) + ' ' + units[unitIndex]
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN')
}

function getFileIcon(file) {
  if (file.isFolder || file.isDir) return '📁'
  const name = (file.fileName || file.name || '').toLowerCase()
  if (/\.(mp4|mkv|avi|mov|flv|wmv|webm|m4v)$/.test(name)) return '🎬'
  if (/\.(mp3|wav|flac|aac|ogg|m4a)$/.test(name)) return '🎵'
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(name)) return '🖼️'
  if (/\.(pdf|doc|docx|txt|md)$/.test(name)) return '📄'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return '📦'
  return '📄'
}

function getIconBg(file) {
  if (file.isFolder || file.isDir) return 'bg-yellow-500/30'
  const name = (file.fileName || file.name || '').toLowerCase()
  if (/\.(mp4|mkv|avi|mov|flv|wmv|webm|m4v)$/.test(name)) return 'bg-purple-500/30'
  if (/\.(mp3|wav|flac|aac|ogg|m4a)$/.test(name)) return 'bg-green-500/30'
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(name)) return 'bg-pink-500/30'
  return 'bg-blue-500/30'
}

function canPlay(file) {
  const name = (file.fileName || file.name || '').toLowerCase()
  return /\.(mp4|webm|m3u8)$/.test(name)
}

async function parseLink() {
  if (!shareUrl.value.trim()) {
    error.value = '请输入分享链接'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`${API_BASE}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: shareUrl.value.trim(),
        accessCode: accessCode.value.trim(),
      }),
    })

    const data = await response.json()

    if (!data.success) {
      error.value = data.error || '解析失败'
      return
    }

    shareInfo.value = data.shareInfo || {}
    fileList.value = data.fileList || {}
    files.value = (data.fileList?.fileList || []).map(f => ({
      ...f,
      isFolder: f.isFolder || f.fileType === 0,
    }))
    currentPath.value = [{ name: '根目录', id: '-11' }]
  } catch (err) {
    error.value = '网络错误：' + err.message
  } finally {
    loading.value = false
  }
}

async function handleFileClick(file) {
  if (file.isFolder || file.fileType === 0) {
    await loadFolder(file.fileId || file.id, file.fileName || file.name)
  } else {
    await getDownloadLink(file)
  }
}

async function loadFolder(fileId, folderName) {
  fileListLoading.value = true

  try {
    const shareId = shareInfo.value?.shareId || ''
    const code = accessCode.value || extractAccessCode(shareUrl.value)

    const response = await fetch(
      `${API_BASE}/filelist?platform=tianyi&shareId=${encodeURIComponent(shareId)}&fileId=${encodeURIComponent(fileId)}&accessCode=${encodeURIComponent(code)}`
    )

    const data = await response.json()

    if (data.success) {
      files.value = (data.data?.fileList || []).map(f => ({
        ...f,
        isFolder: f.isFolder || f.fileType === 0,
      }))
      currentPath.value.push({ name: folderName, id: fileId })
    } else {
      error.value = data.error || '加载文件夹失败'
    }
  } catch (err) {
    error.value = '加载失败：' + err.message
  } finally {
    fileListLoading.value = false
  }
}

function goBack() {
  if (currentPath.value.length > 1) {
    currentPath.value.pop()
    const parent = currentPath.value[currentPath.value.length - 1]
    loadFolder(parent.id, parent.name)
  }
}

function navigateTo(index) {
  if (index === -1) {
    currentPath.value = [{ name: '根目录', id: '-11' }]
    loadFolder('-11', '根目录')
  } else {
    const target = currentPath.value[index + 1]
    if (target) {
      currentPath.value = currentPath.value.slice(0, index + 2)
      loadFolder(target.id, target.name)
    }
  }
}

async function getDownloadLink(file) {
  currentFile.value = file
  downloadUrl.value = ''
  videoUrl.value = ''

  try {
    const shareId = shareInfo.value?.shareId || ''
    const code = accessCode.value || extractAccessCode(shareUrl.value)

    const response = await fetch(
      `${API_BASE}/download?platform=tianyi&shareId=${encodeURIComponent(shareId)}&fileId=${encodeURIComponent(file.fileId || file.id)}&accessCode=${encodeURIComponent(code)}`
    )

    const data = await response.json()

    if (data.success) {
      downloadUrl.value = data.downloadUrl
      if (canPlay(file)) {
        videoUrl.value = `${API_BASE}/stream?url=${encodeURIComponent(data.downloadUrl)}`
      }
    } else {
      error.value = data.error || '获取下载地址失败'
    }
  } catch (err) {
    error.value = '获取下载地址失败：' + err.message
  }
}

function closePlayer() {
  currentFile.value = null
  downloadUrl.value = ''
  videoUrl.value = ''
}

async function copyLink() {
  if (!downloadUrl.value) return
  
  try {
    await navigator.clipboard.writeText(downloadUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    error.value = '复制失败，请手动复制'
  }
}

function extractAccessCode(url) {
  const match = url.match(/访问码[：:]\s*(\w+)/)
  return match ? match[1] : ''
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const url = urlParams.get('url')
  const code = urlParams.get('code')
  if (url) {
    shareUrl.value = url
    if (code) accessCode.value = code
    parseLink()
  }
})
</script>
