<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card p-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ aiStats.totalConversations || 0 }}</p>
            <p class="text-sm text-white/60">总对话数</p>
          </div>
        </div>
      </div>
      <div class="glass-card p-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl">
            💬
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ aiStats.totalMessages || 0 }}</p>
            <p class="text-sm text-white/60">总消息数</p>
          </div>
        </div>
      </div>
      <div class="glass-card p-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
            🔗
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ aiStats.linksDetected || 0 }}</p>
            <p class="text-sm text-white/60">识别链接数</p>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-6">AI助手设置</h3>
      
      <div class="space-y-6">
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p class="font-medium text-white">启用AI助手</p>
            <p class="text-sm text-white/50">开启后用户可以使用AI智能助手功能</p>
          </div>
          <button class="w-12 h-7 rounded-full transition-colors relative"
                  :class="settings.aiEnabled ? 'bg-cyan-500' : 'bg-white/20'"
                  @click="settings.aiEnabled = !settings.aiEnabled">
            <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  :class="settings.aiEnabled ? 'right-1' : 'left-1'"></span>
          </button>
        </div>
        
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p class="font-medium text-white">自动链接识别</p>
            <p class="text-sm text-white/50">AI自动识别对话中的网盘和视频链接</p>
          </div>
          <button class="w-12 h-7 rounded-full transition-colors relative"
                  :class="settings.autoLinkDetect ? 'bg-cyan-500' : 'bg-white/20'"
                  @click="settings.autoLinkDetect = !settings.autoLinkDetect">
            <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  :class="settings.autoLinkDetect ? 'right-1' : 'left-1'"></span>
          </button>
        </div>
        
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p class="font-medium text-white">一键解析</p>
            <p class="text-sm text-white/50">识别链接后自动开始解析</p>
          </div>
          <button class="w-12 h-7 rounded-full transition-colors relative"
                  :class="settings.autoParse ? 'bg-cyan-500' : 'bg-white/20'"
                  @click="settings.autoParse = !settings.autoParse">
            <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  :class="settings.autoParse ? 'right-1' : 'left-1'"></span>
          </button>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-4">最近对话</h3>
      <div class="space-y-3">
        <div v-for="conv in recentConversations" :key="conv.id"
             class="p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-white">{{ conv.account_code || '未知用户' }}</span>
            <span class="text-xs text-white/50">{{ formatTime(conv.updated_at) }}</span>
          </div>
          <p class="text-sm text-white/60">{{ conv.message_count }} 条消息</p>
        </div>
        <div v-if="recentConversations.length === 0" class="text-center py-8 text-white/40">
          暂无对话记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../utils/api'

const aiStats = ref({
  totalConversations: 0,
  totalMessages: 0,
  linksDetected: 0
})

const settings = ref({
  aiEnabled: true,
  autoLinkDetect: true,
  autoParse: false
})

const recentConversations = ref([])

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  recentConversations.value = []
})
</script>
