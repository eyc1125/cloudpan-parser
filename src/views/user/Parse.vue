<template>
  <div class="space-y-6">
    <div class="glass-card p-6">
      <div class="flex flex-wrap gap-2 mb-6">
        <button v-for="tab in tabs" :key="tab.key"
                class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                :class="activeTab === tab.key ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'"
                @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'auto'" class="space-y-4">
        <div>
          <label class="block text-sm text-white/70 mb-2">粘贴内容（自动识别链接）</label>
          <textarea v-model="autoText" rows="5" 
                    class="neon-input resize-none" 
                    placeholder="粘贴包含网盘链接、短视频链接的内容，AI将自动识别并解析..."></textarea>
        </div>
        <button class="neon-btn w-full" @click="autoParse" :disabled="parsing">
          {{ parsing ? '解析中...' : '🔍 智能识别并解析' }}
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-white/70 mb-2">分享链接</label>
          <input v-model="shareUrl" type="text" class="neon-input" 
                 :placeholder="`请输入${currentPlatformName}分享链接`">
        </div>
        <div v-if="showAccessCode">
          <label class="block text-sm text-white/70 mb-2">访问码（选填）</label>
          <input v-model="accessCode" type="text" class="neon-input" placeholder="请输入访问码/提取码">
        </div>
        <div class="md:col-span-2">
          <button class="neon-btn w-full" @click="manualParse" :disabled="parsing">
            {{ parsing ? '解析中...' : '🚀 开始解析' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="detectedLinks.length > 0" class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-4">
        检测到 {{ detectedLinks.length }} 个链接
      </h3>
      <div class="space-y-3">
        <div v-for="(link, index) in detectedLinks" :key="index"
             class="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
          <span class="text-2xl">{{ getPlatformIcon(link.platform) }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-white">{{ link.platformName }}</p>
            <p class="text-sm text-white/50 truncate">{{ link.url }}</p>
            <p v-if="link.accessCode" class="text-xs text-cyan-400 mt-1">
              访问码: {{ link.accessCode }}
            </p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs"
                :class="link.type === 'cloud' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'">
            {{ link.type === 'cloud' ? '网盘' : '短视频' }}
          </span>
          <button class="neon-btn text-sm px-4 py-2" @click="parseLink(link)">
            解析
          </button>
        </div>
      </div>
    </div>

    <div v-if="parseResult" class="glass-card p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-white">
          {{ parseResult.shareInfo?.title || '解析结果' }}
        </h3>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white/70 hover:bg-white/20"
                  @click="copyAllLinks">
            📋 复制全部直链
          </button>
        </div>
      </div>

      <div v-if="parseResult.shareInfo" class="mb-6 p-4 rounded-xl bg-white/5">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-white/50">文件数量</p>
            <p class="text-white font-medium">{{ parseResult.shareInfo.fileCount || 0 }}</p>
          </div>
          <div>
            <p class="text-white/50">分享时间</p>
            <p class="text-white font-medium">{{ parseResult.shareInfo.shareTime || '-' }}</p>
          </div>
          <div>
            <p class="text-white/50">过期时间</p>
            <p class="text-white font-medium">{{ parseResult.shareInfo.expireTime || '永久' }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div v-for="file in parseResult.fileList || []" :key="file.id"
             class="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <div class="flex items-center gap-4">
            <span class="text-2xl">{{ getFileIcon(file.type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium truncate">{{ file.name }}</p>
              <p class="text-sm text-white/50">{{ formatSize(file.size) }} · {{ file.date || '' }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="file.type === 'video'" 
                      class="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30"
                      @click="playVideo(file)">
                ▶️ 播放
              </button>
              <button class="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30"
                      @click="copyLink(file)">
                🔗 复制
              </button>
              <a v-if="file.downloadUrl" :href="file.downloadUrl" target="_blank"
                 class="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30">
                ⬇️ 下载
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="errorMsg" class="glass-card p-6 border border-red-500/30">
      <div class="flex items-center gap-3">
        <span class="text-2xl">❌</span>
        <div>
          <p class="font-medium text-red-400">解析失败</p>
          <p class="text-sm text-white/60">{{ errorMsg }}</p>
        </div>
      </div>
    </div>

    <div v-if="videoPlayer" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
         @click.self="videoPlayer = null">
      <div class="w-full max-w-4xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white truncate">{{ videoPlayer.name }}</h3>
          <button class="text-white/60 hover:text-white text-xl" @click="videoPlayer = null">✕</button>
        </div>
        <div ref="videoContainer" class="aspect-video rounded-xl overflow-hidden bg-black"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../../utils/api'

const activeTab = ref('auto')
const autoText = ref('')
const shareUrl = ref('')
const accessCode = ref('')
const parsing = ref(false)
const parseResult = ref(null)
const errorMsg = ref('')
const detectedLinks = ref([])
const videoPlayer = ref(null)
const videoContainer = ref(null)

const tabs = [
  { key: 'auto', label: '🤖 智能识别' },
  { key: 'tianyi', label: '☁️ 天翼云盘' },
  { key: 'baidu', label: '🔵 百度网盘' },
  { key: 'aliyun', label: '🟠 阿里云盘' },
  { key: 'douyin', label: '🎵 抖音' },
  { key: 'kuaishou', label: '⚡ 快手' }
]

const currentPlatformName = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value)
  return tab ? tab.label.replace(/^\S+\s*/, '') : ''
})

const showAccessCode = computed(() => {
  return ['auto', 'tianyi', 'baidu', 'aliyun', 'quark'].includes(activeTab.value)
})

function getPlatformIcon(platform) {
  const icons = {
    tianyi: '☁️',
    baidu: '🔵',
    aliyun: '🟠',
    quark: '🟣',
    douyin: '🎵',
    kuaishou: '⚡',
    bilibili: '📺',
    xiaohongshu: '📕',
    unknown: '🔗'
  }
  return icons[platform] || '🔗'
}

function getFileIcon(type) {
  if (type === 'folder') return '📁'
  const icons = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
    archive: '📦',
    other: '📄'
  }
  return icons[type] || '📄'
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

async function autoParse() {
  if (!autoText.value.trim()) {
    errorMsg.value = '请输入内容'
    return
  }
  
  parsing.value = true
  errorMsg.value = ''
  parseResult.value = null
  detectedLinks.value = []
  
  try {
    const res = await api.post('/parse/auto', { text: autoText.value })
    if (res.success) {
      detectedLinks.value = res.data.links
      if (res.data.links.length === 0) {
        errorMsg.value = '未检测到有效链接'
      }
    } else {
      errorMsg.value = res.message || '解析失败'
    }
  } catch (e) {
    errorMsg.value = '解析失败: ' + e.message
  } finally {
    parsing.value = false
  }
}

async function manualParse() {
  if (!shareUrl.value.trim()) {
    errorMsg.value = '请输入分享链接'
    return
  }
  
  parsing.value = true
  errorMsg.value = ''
  parseResult.value = null
  
  try {
    const res = await api.post('/parse/tianyi', {
      shareUrl: shareUrl.value,
      accessCode: accessCode.value
    })
    
    if (res.success) {
      parseResult.value = res.data
    } else {
      errorMsg.value = res.message || '解析失败'
    }
  } catch (e) {
    errorMsg.value = '解析失败: ' + e.message
  } finally {
    parsing.value = false
  }
}

async function parseLink(link) {
  if (link.platform === 'tianyi') {
    shareUrl.value = link.url
    accessCode.value = link.accessCode || ''
    activeTab.value = 'tianyi'
    await manualParse()
  } else {
    errorMsg.value = `${link.platformName}解析功能开发中，敬请期待`
  }
}

function copyLink(file) {
  const url = file.downloadUrl || file.url || ''
  navigator.clipboard.writeText(url)
}

function copyAllLinks() {
  const links = (parseResult.value?.fileList || [])
    .map(f => `${f.name}: ${f.downloadUrl || f.url || ''}`)
    .join('\n')
  navigator.clipboard.writeText(links)
}

function playVideo(file) {
  videoPlayer.value = file
}

watch(videoContainer, (el) => {
  if (el && videoPlayer.value) {
    const url = videoPlayer.value.downloadUrl || videoPlayer.value.url
    if (url) {
      el.innerHTML = `<video src="${url}" controls autoplay class="w-full h-full"></video>`
    }
  }
})
</script>
