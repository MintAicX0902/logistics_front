<template>
  <div>
    <!-- 浮动按钮 -->
    <div 
      v-if="!isOpen" 
      class="chat-button"
      @click="openChat"
    >
      <el-icon :size="28"><ChatDotRound /></el-icon>
      <span class="chat-button-text">AI客服</span>
    </div>

    <!-- 聊天窗口 -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chat-window">
        <!-- 头部 -->
        <div class="chat-header">
          <div class="header-left">
            <el-icon :size="20"><Service /></el-icon>
            <span>AI智能客服</span>
          </div>
          <el-icon 
            :size="20" 
            class="close-btn"
            @click="closeChat"
          >
            <Close />
          </el-icon>
        </div>

        <!-- 聊天内容区域 -->
        <div class="chat-content" ref="chatContent">
          <!-- 欢迎消息 -->
          <div class="message ai-message" v-if="welcomeMessage">
            <div class="message-avatar">
              <img :src="aiAvatar" alt="AI" class="avatar-img" />
            </div>
            <div class="message-body">
              <div class="message-text" v-html="parseMarkdown(welcomeMessage)"></div>
            </div>
          </div>

          <!-- 快捷问题 -->
          <div v-if="showQuickQuestions && quickQuestions.length > 0" class="quick-questions">
            <div class="quick-questions-title">猜您想问：</div>
            <div 
              v-for="(question, index) in quickQuestions" 
              :key="index"
              class="quick-question-item"
              @click="handleQuickQuestion(question)"
            >
              <el-icon><QuestionFilled /></el-icon>
              <span>{{ question.text }}</span>
            </div>
          </div>

          <!-- 聊天消息列表 -->
          <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.type">
            <div class="message-avatar">
              <img 
                v-if="msg.type === 'ai-message'" 
                :src="aiAvatar" 
                alt="AI" 
                class="avatar-img" 
              />
              <img 
                v-else 
                :src="userAvatar" 
                alt="User" 
                class="avatar-img"
                @error="handleAvatarError"
              />
            </div>
            <div class="message-body">
              <div class="message-text">
                <span v-if="msg.type === 'ai-message' && msg.isTyping" class="typing-text">
                  <span v-html="parseMarkdown(msg.content)"></span><span class="cursor">|</span>
                </span>
                <span v-else-if="msg.type === 'ai-message'" v-html="parseMarkdown(msg.content)"></span>
                <span v-else>{{ msg.content }}</span>
              </div>
              <div class="message-time">{{ formatTime(msg.time) }}</div>
            </div>
          </div>

          <!-- 加载中提示 -->
          <div v-if="isLoading" class="loading-indicator">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI正在思考中...</span>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input">
          <el-input
            v-model="inputMessage"
            :placeholder="isLoading ? '请等待AI回复...' : '请输入您的问题...'"
            :disabled="isLoading"
            @keyup.enter="sendMessage"
          >
            <template #append>
              <el-button 
                :icon="Promotion" 
                :disabled="!inputMessage.trim() || isLoading"
                @click="sendMessage"
              >
                发送
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { 
  ChatDotRound, 
  Close, 
  Service, 
  Avatar,
  User, 
  QuestionFilled,
  Loading,
  Promotion 
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'

// 导入AI头像图片
import aiAvatarImg from '@/assets/images/deepseek.png'

// 配置marked
marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false
})

// 响应式数据
const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const isLoading = ref(false)
const welcomeMessage = ref('')
const quickQuestions = ref([])
const showQuickQuestions = ref(true)
const chatContent = ref(null)

// AI头像（使用导入的图片）
const aiAvatar = ref(aiAvatarImg)

// 用户头像计算属性
const userAvatar = computed(() => {
  const account = JSON.parse(localStorage.getItem('self-account') || localStorage.getItem('account') || '{}')
  return account.photo || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
})

// 使用marked进行Markdown解析
const parseMarkdown = (text) => {
  if (!text) return ''
  
  try {
    return marked.parse(text)
  } catch (error) {
    console.error('Markdown解析错误:', error)
    return text // 如果解析失败，返回原文本
  }
}

// 打开聊天窗口
const openChat = async () => {
  isOpen.value = true
  
  // 如果是第一次打开，获取欢迎消息和快捷问题
  if (messages.value.length === 0) {
    await loadInitialData()
  }
}

// 关闭聊天窗口
const closeChat = () => {
  isOpen.value = false
}

// 加载初始数据
const loadInitialData = async () => {
  try {
    // 获取用户信息
    const account = JSON.parse(localStorage.getItem('account') || '{}')
    const userId = account.id
    
    console.log('当前用户ID:', userId)
    
    // 获取欢迎消息
    const welcomeRes = await request.get('/ai-chat/welcome', {
      params: { userId: userId }
    })
    if (welcomeRes.code === '200') {
      welcomeMessage.value = welcomeRes.data
    }

    // 获取快捷问题
    const questionsRes = await request.get('/ai-chat/quick-questions', {
      params: { userId: userId }
    })
    if (questionsRes.code === '200') {
      quickQuestions.value = questionsRes.data
    }
  } catch (error) {
    console.error('加载初始数据失败', error)
  }
}

// 处理快捷问题点击
const handleQuickQuestion = (question) => {
  showQuickQuestions.value = false
  
  // 添加用户消息
  messages.value.push({
    type: 'user-message',
    content: question.text,
    time: new Date()
  })
  
  // 发送请求
  sendStreamMessage(question.text, question.type)
}

// 发送消息
const sendMessage = () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const message = inputMessage.value
  inputMessage.value = ''
  showQuickQuestions.value = false
  
  // 添加用户消息
  messages.value.push({
    type: 'user-message',
    content: message,
    time: new Date()
  })
  
  // 发送请求
  sendStreamMessage(message, 'FREE_QUESTION')
}

// 解析SSE行数据
const processSSELine = (line) => {
  const trimmedLine = line.trim()
  
  if (trimmedLine.startsWith('event:')) {
    return { type: 'event', value: trimmedLine.substring(6).trim() }
  } else if (trimmedLine.startsWith('data:')) {
    return { type: 'data', value: trimmedLine.substring(5).trim() }
  } else if (trimmedLine.startsWith('id:')) {
    return { type: 'id', value: trimmedLine.substring(3).trim() }
  } else if (trimmedLine === '') {
    return { type: 'empty', value: '' }
  }
  
  return { type: 'unknown', value: trimmedLine }
}

// 发送流式消息请求
const sendStreamMessage = async (message, questionType) => {
  isLoading.value = true
  
  // 获取用户信息
  const account = JSON.parse(localStorage.getItem('account') || '{}')
  const userId = account.id
  
  console.log('发送消息时的用户ID:', userId)
  
  // 添加AI消息占位符
  const aiMessageIndex = messages.value.length
  messages.value.push({
    type: 'ai-message',
    content: '',
    time: new Date(),
    isTyping: true
  })
  
  try {
    const token = sessionStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8080'
    
    const response = await fetch(`${baseUrl}/ai-chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'token': token
      },
      body: JSON.stringify({
        message: message,
        questionType: questionType,
        userId: userId
      })
    })
    
    if (!response.ok) {
      throw new Error('请求失败')
    }
    
    // 处理流式响应
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      // 按行分割处理SSE数据
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留可能不完整的最后一行
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine === '') continue // 跳过空行
        
        console.log('原始行:', trimmedLine)
        
        // 临时解决方案：处理错误的后端格式
        // 后端错误地将 "event: message" 等内容包含在数据中
        if (trimmedLine.startsWith('data: ')) {
          let data = trimmedLine.substring(6).trim() // 移除 "data: "
          
          // 检查数据是否包含错误的事件标记
          if (data.startsWith('event: ')) {
            // 这是错误格式，需要过滤
            if (data === 'event: connected' || data === 'event: done') {
              // 这些是纯事件，不包含实际数据
              console.log('检测到事件:', data)
              if (data === 'event: done') {
                messages.value[aiMessageIndex].isTyping = false
                isLoading.value = false
              }
              continue
            } else if (data.startsWith('event: message')) {
              // 提取实际的消息内容
              data = data.replace('event: message', '').trim()
            }
          }
          
          // 添加非空数据到消息
          if (data) {
            console.log('添加到消息:', data)
            messages.value[aiMessageIndex].content += data
            scrollToBottom()
          }
        } else if (trimmedLine.startsWith('event: ')) {
          // 标准事件格式（如果后端修复了）
          const eventName = trimmedLine.substring(7).trim()
          console.log('标准事件:', eventName)
          if (eventName === 'done') {
            messages.value[aiMessageIndex].isTyping = false
            isLoading.value = false
          }
        }
      }
    }
    
    // 确保最终状态正确
    messages.value[aiMessageIndex].isTyping = false
    console.log('最终消息内容:', messages.value[aiMessageIndex].content)
    
  } catch (error) {
    console.error('发送消息失败', error)
    ElMessage.error('AI服务暂时不可用，请稍后再试')
    
    // 移除失败的AI消息
    messages.value.splice(aiMessageIndex, 1)
  } finally {
    isLoading.value = false
  }
}

// 格式化时间
const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContent.value) {
      chatContent.value.scrollTop = chatContent.value.scrollHeight
    }
  })
}

// 处理头像加载错误
const handleAvatarError = (e) => {
  e.target.src = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
}
</script>

<style scoped>
.chat-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 120px;
  height: 50px;
  background: linear-gradient(135deg, #7149d5 0%, #9b6dd5 100%);
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(113, 73, 213, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
}

.chat-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(113, 73, 213, 0.4);
}

.chat-button-text {
  font-size: 14px;
  font-weight: 500;
}

.chat-window {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 380px;
  height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #7149d5 0%, #9b6dd5 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.close-btn {
  cursor: pointer;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 0.8;
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f7;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-in;
}

.message.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ai-message .message-avatar {
  background: linear-gradient(135deg, #7149d5 0%, #9b6dd5 100%);
  color: white;
}

.user-message .message-avatar {
  background: #f0f0f0;
  color: #666;
}

.message-body {
  max-width: 70%;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  word-wrap: break-word;
  line-height: 1.6;
}

.user-message .message-text {
  background: #7149d5;
  color: white;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3) {
  margin: 0.5em 0;
  font-weight: 600;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(li) {
  margin: 4px 0;
  line-height: 1.5;
}

.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 16px;
  margin: 8px 0;
  color: #666;
}

.message-text :deep(a) {
  color: #7149d5;
  text-decoration: none;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}

.message-text :deep(strong) {
  font-weight: 600;
}

.message-text :deep(em) {
  font-style: italic;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.user-message .message-time {
  text-align: left;
}

.quick-questions {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.quick-questions-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.quick-question-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f5f5f7;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.quick-question-item:hover {
  background: #e8e8ea;
  transform: translateX(4px);
}

.quick-question-item:last-child {
  margin-bottom: 0;
}

.chat-input {
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.typing-text {
  position: relative;
}

.cursor {
  animation: blink 1s infinite;
  font-weight: normal;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .chat-window {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
  
  .chat-button {
    bottom: 20px;
    right: 20px;
  }
}
</style>