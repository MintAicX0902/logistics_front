<template>
  <div class="chat-container">
    <!-- 头部信息 -->
    <div class="chat-header">
      <div class="header-left">
        <el-button 
          :icon="ArrowLeft" 
          circle 
          size="small"
          @click="goBack"
        />
        <div class="header-info">
          <img 
            :src="chatInfo.otherUserAvatar || defaultAvatar" 
            alt="头像" 
            class="avatar"
            @error="handleAvatarError"
          />
          <div class="user-info">
            <h3>{{ chatInfo.otherUserName || '加载中...' }}</h3>
            <p class="status">
              {{ chatInfo.otherUserType === 'SIJI' ? '配送员' : '用户' }}
              <span v-if="chatInfo.otherUserPhone">· {{ chatInfo.otherUserPhone }}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="order-info">
        <el-tag type="success" size="small">运单号: {{ yundanCode }}</el-tag>
        <el-tag type="info" size="small">{{ chatInfo.yundanStatus }}</el-tag>
      </div>
    </div>

    <!-- 运单信息条 -->
    <div class="order-bar" v-if="chatInfo.startAddr">
      <div class="route-info">
        <span class="route-point start">{{ chatInfo.startAddr }}</span>
        <el-icon class="route-arrow"><Right /></el-icon>
        <span class="route-point end">{{ chatInfo.endAddr }}</span>
        <span class="weight">{{ chatInfo.allweight }}吨</span>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="chat-messages" ref="messageContainer" v-loading="loading">
      <div v-if="!canChat" class="chat-disabled">
        <el-alert 
          title="当前运单状态无法进行聊天" 
          type="warning" 
          :closable="false"
          center
          show-icon
        />
      </div>
      
      <div v-else-if="messages.length === 0" class="empty-message">
        <el-empty description="暂无消息，开始聊天吧~" />
      </div>
      
      <div 
        v-for="msg in messages" 
        :key="msg.messageId"
        :class="['message-item', msg.senderId === chatInfo.currentUserId ? 'self' : 'other']"
      >
        <img 
          :src="(msg.senderId === chatInfo.currentUserId ? chatInfo.currentUserAvatar : chatInfo.otherUserAvatar) || defaultAvatar" 
          alt="头像" 
          class="msg-avatar"
          @error="handleAvatarError"
        />
        <div class="message-wrapper">
          <div class="message-content">
            <div class="message-bubble">
              <!-- 文本消息 -->
              <span v-if="msg.messageType === 'TEXT'" class="text-content">
                {{ msg.content }}
              </span>
              <!-- 图片消息 -->
              <div v-else-if="msg.messageType === 'IMAGE'" class="image-content">
                <el-image
                  :src="msg.content"
                  :preview-src-list="[msg.content]"
                  fit="cover"
                  :preview-teleported="true"
                  @error="handleImageError"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>图片加载失败</span>
                    </div>
                  </template>
                </el-image>
              </div>
            </div>
            <div class="message-meta">
              <span class="time">{{ formatTime(msg.createTime) }}</span>
              <span v-if="msg.senderId === chatInfo.currentUserId" class="status">
                <el-icon v-if="msg.sendStatus === 'SENDING'" class="is-loading">
                  <Loading />
                </el-icon>
                <el-tooltip v-else-if="msg.sendStatus === 'FAILED'" content="发送失败，点击重试">
                  <el-icon color="#F56C6C" class="clickable" @click="resendMessage(msg)">
                    <WarningFilled />
                  </el-icon>
                </el-tooltip>
                <el-icon v-else-if="msg.isRead" color="#67C23A">
                  <Check />
                </el-icon>
                <el-icon v-else color="#909399">
                  <Check />
                </el-icon>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input" v-if="canChat">
      <div class="input-toolbar">
        <el-upload
          class="upload-btn"
          :action="uploadUrl"
          :headers="uploadHeaders"
          :show-file-list="false"
          :before-upload="beforeUpload"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :disabled="uploading"
          accept="image/*"
        >
          <el-tooltip content="发送图片">
            <el-button :icon="Picture" circle :loading="uploading" />
          </el-tooltip>
        </el-upload>
      </div>
      
      <el-input
        v-model="inputMessage"
        placeholder="输入消息..."
        @keyup.enter="sendTextMessage"
        :maxlength="500"
        show-word-limit
        class="message-input"
      />
      
      <el-button 
        type="primary" 
        @click="sendTextMessage"
        :disabled="!inputMessage.trim()"
        class="send-btn"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
// polyfill
if (typeof global === 'undefined') {
  window.global = window;
}
if (typeof process === 'undefined') {
  window.process = { env: {} };
}

import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Loading, WarningFilled, Check, ArrowLeft, Right } from '@element-plus/icons-vue'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()
const yundanCode = computed(() => route.params.yundanCode)

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 数据
const chatInfo = reactive({})
const messages = ref([])
const inputMessage = ref('')
const messageContainer = ref(null)
const loading = ref(false)
const uploading = ref(false)

// WebSocket客户端
let stompClient = null
let reconnectTimer = null
let reconnectCount = 0
const maxReconnectAttempts = 5

// 计算属性
const canChat = computed(() => chatInfo.yundanStatusTypes === 1)

const uploadUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  return baseUrl + '/chat/upload/image'
})

const uploadHeaders = computed(() => {
  const token = sessionStorage.getItem('token')
  return token ? { 'token': token } : {}
})

// 初始化
onMounted(async () => {
  loading.value = true
  await loadChatInfo()
  if (canChat.value) {
    connectWebSocket()
  }
  loading.value = false
})

onUnmounted(() => {
  disconnectWebSocket()
})

// 返回上一页
const goBack = () => {
  window.close()
  // 如果无法关闭窗口，则返回上一页
  setTimeout(() => {
    router.back()
  }, 100)
}

// 加载聊天信息
const loadChatInfo = async () => {
  try {
    const res = await request({
      url: `/chat/info/${yundanCode.value}`,
      method: 'get'
    })
    
    if (res.code === '200') {
      Object.assign(chatInfo, res.data)
      document.title = `与${chatInfo.otherUserName}的聊天`
    } else {
      if (res.code === '403') {
        ElMessage.error('您无权查看此运单的聊天记录')
        // 3秒后关闭窗口或返回
        setTimeout(() => {
          window.close()
          router.back()
        }, 3000)
      } else {
        ElMessage.error(res.msg || '加载聊天信息失败')
      }
    }
  } catch (error) {
    console.error('加载聊天信息失败:', error)
    ElMessage.error('加载聊天信息失败')
  }
}

// 连接websocket
const connectWebSocket = () => {
  const token = sessionStorage.getItem('token')
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  
  // socketjs需要使用http协议，而非ws协议
  const sockjsUrl = baseUrl + '/ws-chat'
  
  console.log('正在连接WebSocket:', sockjsUrl)
  
  try {
    const socket = new SockJS(sockjsUrl)
    
    stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        token: token,
        yundanCode: yundanCode.value
      },
      debug: (str) => {
        console.log('STOMP Debug:', str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('WebSocket连接成功', frame)
        reconnectCount = 0
        const chatSubscription = stompClient.subscribe(`/user/queue/chat/${yundanCode.value}`, (message) => {
        console.log('收到聊天消息:', message)
        const msg = JSON.parse(message.body)
        
        // 只有当收到的消息不是自己发的时，才添加到消息列表
        if (msg.senderId !== chatInfo.currentUserId) {
            messages.value.push(msg)
            
            // 如果是对方发来的消息，自动标记为已读
            markAsRead([msg.messageId])
        }
        
        scrollToBottom()
        })
        
        // 订阅回执
        const receiptSubscription = stompClient.subscribe('/user/queue/receipt', (message) => {
          console.log('收到回执:', message)
          const receipt = JSON.parse(message.body)
          updateMessageStatus(receipt.messageId, receipt.status)
          
          if (receipt.status === 'FAILED') {
            ElMessage.error(receipt.errorMsg || '消息发送失败')
          }
        })
        
        // 订阅已读状态
        const readSubscription = stompClient.subscribe(`/user/queue/read/${yundanCode.value}`, (message) => {
        console.log('收到已读状态:', message)
        const readInfo = JSON.parse(message.body)
        
        // 只更新自己发送的消息的已读状态
        readInfo.messageIds.forEach(messageId => {
            const msg = messages.value.find(m => 
            m.messageId === messageId && 
            m.senderId === chatInfo.currentUserId
            )
            if (msg) {
            msg.isRead = true
            }
        })
        })
        
        // 订阅运单状态变化
        const statusSubscription = stompClient.subscribe(`/topic/yundan/${yundanCode.value}/status`, (message) => {
          console.log('收到运单状态变化:', message)
          const statusInfo = JSON.parse(message.body)
          if (statusInfo.type === 'CHAT_CLOSED') {
            chatInfo.yundanStatusTypes = 2
            ElMessage.warning(statusInfo.message)
          }
        })
        
        // 订阅未读消息响应
        const unreadSubscription = stompClient.subscribe(`/user/queue/unread/${yundanCode.value}`, (message) => {
          console.log('收到未读消息:', message)
          const unreadMessages = JSON.parse(message.body)
          messages.value.push(...unreadMessages)
          scrollToBottom()
        })
        
        // 发送获取未读消息请求
        console.log('请求获取未读消息')
        stompClient.publish({
          destination: '/app/chat/unread',
          body: JSON.stringify(yundanCode.value)
        })
      },
      onStompError: (frame) => {
        console.error('STOMP错误:', frame.headers.message)
        console.error('错误详情:', frame.body)
        handleConnectionError()
      },
      onWebSocketClose: (event) => {
        console.log('WebSocket连接关闭', event)
        handleConnectionError()
      },
      onWebSocketError: (error) => {
        console.error('WebSocket错误:', error)
        handleConnectionError()
      },
      onDisconnect: (frame) => {
        console.log('WebSocket断开连接', frame)
      }
    })
    
    // 激活连接
    stompClient.activate()
    
  } catch (error) {
    console.error('创建WebSocket连接失败:', error)
    ElMessage.error('无法连接到聊天服务器')
  }
}

// 断开websocket连接
const disconnectWebSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (stompClient && stompClient.connected) {
    stompClient.deactivate()
  }
}

// 处理连接错误
const handleConnectionError = () => {
  if (reconnectCount < maxReconnectAttempts) {
    reconnectCount++
    const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000)
    
    console.log(`${delay/1000}秒后尝试第${reconnectCount}次重连...`)
    
    reconnectTimer = setTimeout(() => {
      if (canChat.value) {
        connectWebSocket()
      }
    }, delay)
  } else {
    ElMessage.error('聊天服务连接失败，请刷新页面重试')
  }
}

// 发送文本消息
const sendTextMessage = () => {
  if (!inputMessage.value.trim() || !canChat.value) return
  
  const message = {
    messageId: generateMessageId(),
    yundanCode: yundanCode.value,
    messageType: 'TEXT',
    content: inputMessage.value.trim(),
    sendStatus: 'SENDING',
    createTime: new Date().toISOString(),
    senderId: chatInfo.currentUserId,
    senderAvatar: chatInfo.currentUserAvatar,
    senderName: chatInfo.currentUserName,
    isRead: false
  }
  
  // 添加到消息列表
  messages.value.push(message)
  inputMessage.value = ''
  scrollToBottom()
  
  // 发送消息
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: '/app/chat/send',
      body: JSON.stringify(message)
    })
  } else {
    updateMessageStatus(message.messageId, 'FAILED')
    ElMessage.error('消息发送失败，请检查网络连接')
  }
}

// 发送图片消息
const sendImageMessage = (imageUrl) => {
  const message = {
    messageId: generateMessageId(),
    yundanCode: yundanCode.value,
    messageType: 'IMAGE',
    content: imageUrl,
    sendStatus: 'SENDING',
    createTime: new Date().toISOString(),
    senderId: chatInfo.currentUserId,
    senderAvatar: chatInfo.currentUserAvatar,
    senderName: chatInfo.currentUserName,
    isRead: false
  }
  
  messages.value.push(message)
  scrollToBottom()
  
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: '/app/chat/send',
      body: JSON.stringify(message)
    })
  } else {
    updateMessageStatus(message.messageId, 'FAILED')
    ElMessage.error('图片发送失败，请检查网络连接')
  }
}

// 重发消息
const resendMessage = async (msg) => {
  try {
    await ElMessageBox.confirm('确定要重新发送这条消息吗？', '提示', {
      confirmButtonText: '重发',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    msg.sendStatus = 'SENDING'
    
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/chat/send',
        body: JSON.stringify(msg)
      })
    } else {
      ElMessage.error('消息发送失败，请检查网络连接')
    }
  } catch {
    // 用户取消
  }
}

// 标记已读
const markAsRead = (messageIds) => {
  if (!messageIds || messageIds.length === 0) return
  
  const readMessage = {
    yundanCode: yundanCode.value,
    messageIds: messageIds,
    senderId: chatInfo.otherUserId,
    senderType: chatInfo.otherUserType
  }
  
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: '/app/chat/read',
      body: JSON.stringify(readMessage)
    })
  }
}

// 图片上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
    return false
  }
  
  uploading.value = true
  return true
}

// 上传成功
const handleUploadSuccess = (response) => {
  uploading.value = false
  
  if (response.code === '200') {
    sendImageMessage(response.data)
  } else {
    ElMessage.error(response.msg || '上传失败')
  }
}

// 上传失败
const handleUploadError = () => {
  uploading.value = false
  ElMessage.error('图片上传失败，请重试')
}

// 处理头像加载错误
const handleAvatarError = (e) => {
  e.target.src = defaultAvatar
}

// 处理图片加载错误
const handleImageError = () => {
  console.log('图片加载失败')
}

// 工具函数
const generateMessageId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const updateMessageStatus = (messageId, status) => {
  const msg = messages.value.find(m => m.messageId === messageId)
  if (msg) {
    msg.sendStatus = status
  }
}

const markMessagesAsRead = (messageIds) => {
  messageIds.forEach(id => {
    const msg = messages.value.find(m => m.messageId === id)
    if (msg) {
      msg.isRead = true
    }
  })
}

const formatTime = (time) => {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  // 今天的消息只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 昨天的消息
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 本周的消息显示星期几
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekDays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 更早的消息显示完整日期
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动到底部
watch(() => messages.value.length, () => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 头部样式 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #f0f0f0;
}

.user-info h3 {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.user-info .status {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.order-info {
  display: flex;
  gap: 8px;
}

/* 运单信息条 */
.order-bar {
  padding: 8px 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.route-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.route-point {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-point.start {
  color: #7149d5;
}

.route-point.end {
  color: #409eff;
}

.route-arrow {
  color: #999;
}

.weight {
  margin-left: 12px;
  padding: 2px 8px;
  background-color: #e8f4fd;
  border-radius: 12px;
  font-size: 12px;
  color: #409eff;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f5f5;
}

.chat-disabled {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
}

.message-item.self {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.message-wrapper {
  margin: 0 12px;
  max-width: 65%;
}

.message-content {
  display: inline-block;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.message-item.other .message-bubble {
  background-color: #fff;
  border: 1px solid #e8e8e8;
}

.message-item.self .message-bubble {
  background: linear-gradient(135deg, #7149d5 0%, #5a3bbd 100%);
  color: #fff;
  border: 1px solid #7149d5;
}

.text-content {
  white-space: pre-wrap;
  line-height: 1.5;
}

.image-content {
  cursor: pointer;
}

.image-content .el-image {
  display: block;
  max-width: 240px;
  max-height: 240px;
  border-radius: 8px;
  overflow: hidden;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  background-color: #f5f5f5;
  color: #999;
  font-size: 12px;
  gap: 4px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  padding: 0 4px;
}

.message-item.self .message-meta {
  justify-content: flex-end;
}

.status .clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.status .clickable:hover {
  transform: scale(1.2);
}

/* 输入区域 */
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 20px;
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.04);
}

.input-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn {
  display: inline-block;
}

.message-input {
  flex: 1;
}

.message-input :deep(.el-input__inner) {
  border-radius: 20px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
}

.message-input :deep(.el-input__inner:focus) {
  background-color: #fff;
  border-color: #7149d5;
}

.send-btn {
  border-radius: 20px;
  padding: 8px 24px;
  background: linear-gradient(135deg, #7149d5 0%, #5a3bbd 100%);
  border: none;
  transition: all 0.3s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(113, 73, 213, 0.3);
}

/* 加载动画 */
.is-loading {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background-color: #ccc;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .message-wrapper {
    max-width: 75%;
  }
  
  .route-point {
    max-width: 120px;
  }
  
  .image-content .el-image {
    max-width: 180px;
    max-height: 180px;
  }
}
</style>