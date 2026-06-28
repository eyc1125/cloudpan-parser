<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-6">基础设置</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-white/70 mb-2">站点名称</label>
            <input v-model="settings.siteName" type="text" class="neon-input" placeholder="请输入站点名称">
          </div>
          
          <div>
            <label class="block text-sm text-white/70 mb-2">站点描述</label>
            <textarea v-model="settings.siteDesc" rows="3" class="neon-input resize-none" placeholder="请输入站点描述"></textarea>
          </div>
          
          <div>
            <label class="block text-sm text-white/70 mb-2">默认账号有效期（天）</label>
            <input v-model.number="settings.defaultDuration" type="number" min="1" class="neon-input">
          </div>
          
          <div>
            <label class="block text-sm text-white/70 mb-2">单文件上传大小限制（MB）</label>
            <input v-model.number="settings.maxFileSize" type="number" min="1" class="neon-input">
          </div>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-lg font-bold text-white mb-6">功能开关</h3>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p class="font-medium text-white">用户注册</p>
              <p class="text-sm text-white/50">允许用户自助注册账号</p>
            </div>
            <button class="w-12 h-7 rounded-full transition-colors relative"
                    :class="settings.enableRegister ? 'bg-cyan-500' : 'bg-white/20'"
                    @click="settings.enableRegister = !settings.enableRegister">
              <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    :class="settings.enableRegister ? 'right-1' : 'left-1'"></span>
            </button>
          </div>
          
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p class="font-medium text-white">文件上传</p>
              <p class="text-sm text-white/50">允许用户上传文件获取直链</p>
            </div>
            <button class="w-12 h-7 rounded-full transition-colors relative"
                    :class="settings.enableUpload ? 'bg-cyan-500' : 'bg-white/20'"
                    @click="settings.enableUpload = !settings.enableUpload">
              <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    :class="settings.enableUpload ? 'right-1' : 'left-1'"></span>
            </button>
          </div>
          
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p class="font-medium text-white">AI助手</p>
              <p class="text-sm text-white/50">启用AI智能助手功能</p>
            </div>
            <button class="w-12 h-7 rounded-full transition-colors relative"
                    :class="settings.enableAI ? 'bg-cyan-500' : 'bg-white/20'"
                    @click="settings.enableAI = !settings.enableAI">
              <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    :class="settings.enableAI ? 'right-1' : 'left-1'"></span>
            </button>
          </div>
          
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p class="font-medium text-white">短视频解析</p>
              <p class="text-sm text-white/50">启用抖音/快手等短视频解析</p>
            </div>
            <button class="w-12 h-7 rounded-full transition-colors relative"
                    :class="settings.enableVideoParse ? 'bg-cyan-500' : 'bg-white/20'"
                    @click="settings.enableVideoParse = !settings.enableVideoParse">
              <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    :class="settings.enableVideoParse ? 'right-1' : 'left-1'"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-lg font-bold text-white mb-6">主题设置</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="theme in themes" :key="theme.id"
             class="p-4 rounded-xl cursor-pointer border-2 transition-all"
             :class="settings.theme === theme.id ? 'border-cyan-500' : 'border-transparent bg-white/5 hover:bg-white/10'"
             @click="settings.theme = theme.id">
          <div class="h-16 rounded-lg mb-3" :style="{ background: theme.preview }"></div>
          <p class="text-sm font-medium text-white text-center">{{ theme.name }}</p>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button class="neon-btn" @click="saveSettings">
        保存设置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const settings = ref({
  siteName: '云盘直链解析平台',
  siteDesc: '全能型直链解析与文件存储平台',
  defaultDuration: 30,
  maxFileSize: 100,
  enableRegister: false,
  enableUpload: true,
  enableAI: true,
  enableVideoParse: true,
  theme: 'deep-space'
})

const themes = [
  { id: 'deep-space', name: '深空科技', preview: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #2d1b69 100%)' },
  { id: 'ocean-blue', name: '深海蓝调', preview: 'linear-gradient(135deg, #0c1929 0%, #163152 50%, #1e4a7a 100%)' },
  { id: 'forest-green', name: '森林绿意', preview: 'linear-gradient(135deg, #0a1a0a 0%, #1a3e1a 50%, #1b692d 100%)' },
  { id: 'sunset-purple', name: '暮光紫霞', preview: 'linear-gradient(135deg, #1a0a1a 0%, #3e1a3e 50%, #691b4a 100%)' }
]

function saveSettings() {
  alert('设置已保存')
}
</script>
