<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="relative">
        <input v-model="searchKeyword" type="text" placeholder="搜索文件..." 
               class="neon-input pl-10 w-64">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
      </div>
      <select v-model="typeFilter" class="neon-input w-36">
        <option value="">全部类型</option>
        <option value="image">图片</option>
        <option value="video">视频</option>
        <option value="audio">音频</option>
        <option value="document">文档</option>
        <option value="archive">压缩包</option>
        <option value="other">其他</option>
      </select>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="text-left p-4 text-sm font-medium text-white/60">文件名</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">类型</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">大小</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">上传者</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">上传时间</th>
              <th class="text-left p-4 text-sm font-medium text-white/60">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in files" :key="file.id" 
                class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ getFileIcon(file.file_type) }}</span>
                  <span class="text-white truncate max-w-xs">{{ file.file_name }}</span>
                </div>
              </td>
              <td class="p-4">
                <span class="px-2 py-1 rounded-full text-xs"
                      :class="getTypeClass(file.file_type)">
                  {{ getTypeName(file.file_type) }}
                </span>
              </td>
              <td class="p-4 text-sm text-white/70">{{ formatSize(file.file_size) }}</td>
              <td class="p-4 text-sm text-white/60">{{ file.account_code || '-' }}</td>
              <td class="p-4 text-sm text-white/50">{{ formatDate(file.created_at) }}</td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <button class="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                          @click="copyUrl(file)">
                    复制链接
                  </button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          @click="deleteFile(file)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="files.length === 0">
              <td colspan="6" class="p-12 text-center text-white/40">
                暂无文件
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

const files = ref([])
const searchKeyword = ref('')
const typeFilter = ref('')

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

function formatDate(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function copyUrl(file) {
  navigator.clipboard.writeText(file.direct_url || '')
}

function deleteFile(file) {
  if (!confirm(`确定要删除文件 ${file.file_name} 吗？`)) return
}

onMounted(() => {
  files.value = []
})
</script>
