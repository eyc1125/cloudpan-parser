<template>
  <div class="space-y-6">
    <div class="glass-card p-8">
      <div
        class="border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer"
        :class="isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/20 hover:border-white/40'"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
        @paste="handlePaste"
        tabindex="0"
      >
        <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileSelect">
        
        <div class="text-6xl mb-4 animate-bounce">📤</div>
        <h3 class="text-xl font-bold text-white mb-2">
          {{ isDragging ? '释放文件开始上传' : '拖拽文件到这里' }}
        </h3>
        <p class="text-white/50 mb-4">
          或 <span class="text-cyan-400 cursor-pointer hover:underline">点击选择文件</span> · 支持粘贴图片
        </p>
        <p class="text-xs text-white/30">
          支持图片、视频、文档、压缩包等任意格式 · 单文件最大 100MB
        </p>
      </div>
    </div>

    <div v-if="uploadingFiles.length > 0" class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-4">上传中</h3>
      <div class="space-y-3">
        <div v-for="file in uploadingFiles" :key="file.id"
             class="p-4 rounded-xl bg-white/5">
          <div class="flex items-center gap-4 mb-2">
            <span class="text-2xl">{{ getFileIcon(file.type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium truncate">{{ file.name }}</p>
              <p class="text-sm text-white/50">{{ formatSize(file.size) }}</p>
            </div>
            <span v-if="file.status === 'uploading'" class="text-sm text-cyan-400">
              {{ file.progress }}%
            </span>
            <span v-else-if="file.status === 'success'" class="text-sm text-green-400">
              ✅ 完成
            </span>
            <span v-else class="text-sm text-red-400">
              ❌ 失败
            </span>
          </div>
          <div v-if="file.status === 'uploading'" class="h-2 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
                 :style="{ width: file.progress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-white">我的文件</h3>
        <div class="flex items-center gap-2">
          <select v-model="filterType" class="neon-input text-sm w-32">
            <option value="">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
            <option value="document">文档</option>
            <option value="archive">压缩包</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="file in files" :key="file.id"
             class="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group">
          <div class="flex items-start gap-3 mb-3">
            <span class="text-3xl">{{ getFileIcon(file.file_type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium truncate" :title="file.file_name">{{ file.file_name }}</p>
              <p class="text-xs text-white/50">{{ formatSize(file.file_size) }}</p>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button class="flex-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
                    @click="copyUrl(file)">
              📋 复制链接
            </button>
            <button class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                    @click="deleteFile(file)">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div v-if="files.length === 0" class="text-center py-12 text-white/40">
        <span class="text-4xl mb-4 block">📂</span>
        <p>还没有上传文件</p>
      </div>

      <div v-if="total > pageSize" class="flex items-center justify-center gap-2 mt-6">
        <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-50"
                :disabled="page <= 1" @click="page--; loadFiles()">
          上一页
        </button>
        <span class="text-sm text-white/60">{{ page }} / {{ totalPages }}</span>
        <button class="px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-50"
                :disabled="page >= totalPages" @click="page++; loadFiles()">
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../../utils/api'

const fileInput = ref(null)
const isDragging = ref(false)
const uploadingFiles = ref([])
const files = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const filterType = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

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

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  uploadFiles(files)
}

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  uploadFiles(files)
}

function handlePaste(e) {
  const items = e.clipboardData?.items || []
  const files = []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    uploadFiles(files)
  }
}

async function uploadFiles(fileList) {
  for (const file of fileList) {
    const uploadItem = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: getFileType(file.name),
      status: 'uploading',
      progress: 0
    }
    uploadingFiles.value.unshift(uploadItem)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const xhr = new XMLHttpRequest()
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          uploadItem.progress = Math.round((e.loaded / e.total) * 100)
        }
      }
      
      const token = localStorage.getItem('token')
      xhr.open('POST', '/api/upload/file')
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.success) {
            uploadItem.status = 'success'
            files.value.unshift(res.data)
          } else {
            uploadItem.status = 'error'
          }
        } catch {
          uploadItem.status = 'error'
        }
      }
      
      xhr.onerror = () => {
        uploadItem.status = 'error'
      }
      
      xhr.send(formData)
      
    } catch (e) {
      uploadItem.status = 'error'
    }
  }
}

function getFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']
  
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  if (archiveExts.includes(ext)) return 'archive'
  return 'other'
}

function copyUrl(file) {
  const url = window.location.origin + file.direct_url
  navigator.clipboard.writeText(url)
}

async function deleteFile(file) {
  if (!confirm(`确定要删除 ${file.file_name} 吗？`)) return
  
  try {
    const res = await api.delete(`/upload/${file.id}`)
    if (res.success) {
      files.value = files.value.filter(f => f.id !== file.id)
    }
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

async function loadFiles() {
  try {
    let url = `/upload/list?page=${page.value}&pageSize=${pageSize}`
    if (filterType.value) url += `&type=${filterType.value}`
    
    const res = await api.get(url)
    if (res.success) {
      files.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载文件失败:', e)
  }
}

onMounted(() => {
  loadFiles()
})
</script>
