<template>
  <div class="glass-card h-[calc(100vh-200px)] flex flex-col overflow-hidden">
    <div class="p-4 border-b border-white/10 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
        <span class="text-xl">🤖</span>
      </div>
      <div>
        <h3 class="font-bold text-white">智能助手</h3>
        <p class="text-xs text-green-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          在线
        </p>
      </div>
    </div>

    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="messages.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🤖</div>
        <h3 class="text-xl font-bold text-white mb-2">你好！我是云盘智能助手</h3>
        <p class="text-white/50 mb-6">我可以帮你解析网盘链接、提取视频、回答问题</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button v-for="quick in quickQuestions" :key="quick"
                  class="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-colors"
                  @click="sendMessage(quick)">
            {{ quick }}
          </button>
        </div>
      </div>

      <div v-for="(msg, index) in messages" :key="index"
           class="flex gap-3" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
        <div v-if="msg.role === 'assistant'" class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span class="text-sm">🤖</span>
        </div>
        <div class="max-w-[75%] p-3 rounded-2xl"
             :class="msg.role === 'user' 
               ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-tr-sm' 
               : 'bg-white/10 text-white/90 rounded-tl-sm'">
          <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
          <p class="text-xs mt-1 opacity-50">{{ formatTime(msg.time) }}</p>
        </div>
        <div v-if="msg.role === 'user'" class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <span class="text-sm text-white font-bold">{{ userInitial }}</span>
        </div>
      </div>

      <div v-if="isTyping" class="flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span class="text-sm">🤖</span>
        </div>
        <div class="bg-white/10 p-3 rounded-2xl rounded-tl-sm">
          <div class="flex gap-1">
            <span class="w-2 h-2 rounded-full bg-white/60 animate-bounce" style="animation-delay: 0s"></span>
            <span class="w-2 h-2 rounded-full bg-white/60 animate-bounce" style="animation-delay: 0.1s"></span>
            <span class="w-2 h-2 rounded-full bg-white/60 animate-bounce" style="animation-delay: 0.2s"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-white/10">
      <div class="flex gap-3">
        <div class="flex-1 relative">
          <textarea v-model="inputMessage" 
                    rows="1"
                    class="neon-input pr-12 resize-none"
                    placeholder="输入消息或粘贴链接... (Enter发送，Shift+Enter换行)"
                    @keydown.enter.exact.prevent="handleSend"
                    @input="autoResize"></textarea>
          <button class="absolute right-3 bottom-3 text-xl hover:scale-110 transition-transform"
                  @click="handleSend" :disabled="!inputMessage.trim()">
            🚀
          </button>
        </div>
      </div>
      <p class="text-xs text-white/30 mt-2 text-center">
        AI 生成内容仅供参考，请自行核实
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { api } from '../../utils/api'

const userStore = useUserStore()
const chatContainer = ref(null)
const messages = ref([])
const inputMessage = ref('')
const isTyping = ref(false)
const conversationId = ref(null)

const quickQuestions = [
  '你好，你能做什么？',
  '帮我解析网盘链接',
  '如何上传文件？',
  '查看使用帮助'
]

const userInitial = computed(() => {
  const code = userStore.userInfo.accountCode || 'U'
  return code.charAt(0).toUpperCase()
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function autoResize(e) {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
}

function sendMessage(text) {
  inputMessage.value = text
  handleSend()
}

async function handleSend() {
  const text = inputMessage.value.trim()
  if (!text || isTyping.value) return
  
  messages.value.push({
    role: 'user',
    content: text,
    time: Date.now()
  })
  
  inputMessage.value = ''
  isTyping.value = true
  
  await nextTick()
  scrollToBottom()
  
  try {
    const res = await api.post('/ai/chat', {
      message: text,
      conversationId: conversationId.value
    })
    
    if (res.success) {
      conversationId.value = res.data.conversationId
      messages.value.push({
        role: 'assistant',
        content: res.data.message,
        time: res.data.timestamp
      })
    } else {
      messages.value.push({
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
        time: Date.now()
      })
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '网络错误，请检查网络连接后重试。',
      time: Date.now()
    })
  } finally {
    isTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

watch(messages, () => {
  nextTick(scrollToBottom)
}, { deep: true })

onMounted(() => {
  scrollToBottom()
})
</script>
