<template>
  <el-dialog
    v-model="visible"
    title="评价订单"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="ratingFormRef"
      :model="ratingForm"
      :rules="ratingRules"
      label-width="100px"
    >
      <el-form-item label="运单信息">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="运单号">{{ orderInfo.code }}</el-descriptions-item>
          <el-descriptions-item label="配送员">{{ orderInfo.sijiName }}</el-descriptions-item>
          <el-descriptions-item label="出发地">{{ orderInfo.startAddr }}</el-descriptions-item>
          <el-descriptions-item label="目的地">{{ orderInfo.endAddr }}</el-descriptions-item>
        </el-descriptions>
      </el-form-item>
      
      <el-form-item label="评分" prop="rating">
        <el-rate
          v-model="ratingForm.rating"
          :texts="rateTexts"
          show-text
          style="height: 40px;"
        />
      </el-form-item>
      
      <el-form-item label="评价标签">
        <div class="tag-container">
          <el-check-tag
            v-for="tag in availableTags"
            :key="tag.id"
            :checked="ratingForm.tags.includes(tag.tagName)"
            @change="handleTagChange(tag.tagName)"
            style="margin: 5px;"
          >
            {{ tag.tagName }}
          </el-check-tag>
        </div>
      </el-form-item>
      
      <el-form-item label="文字评价" prop="comment">
        <el-input
          v-model="ratingForm.comment"
          type="textarea"
          :rows="4"
          placeholder="请输入您对本次配送服务的评价（选填）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submitRating" :loading="loading">
        提交评价
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orderInfo: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'rating-success'])

// 对话框显示状态
const visible = ref(false)
const loading = ref(false)

// 评价表单
const ratingFormRef = ref()
const ratingForm = reactive({
  yundanId: null,
  rating: 5,
  tags: [],
  comment: ''
})

// 表单验证规则
const ratingRules = {
  rating: [
    { required: true, message: '请选择评分', trigger: 'change' }
  ],
  comment: [
    { max: 500, message: '评价内容不能超过500字', trigger: 'blur' }
  ]
}

// 评分文字
const rateTexts = ['极差', '失望', '一般', '满意', '非常满意']

// 可用标签
const availableTags = ref([])

// 监听显示状态
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    // 重置表单
    ratingForm.yundanId = props.orderInfo.id
    ratingForm.rating = 5
    ratingForm.tags = []
    ratingForm.comment = ''
    
    // 加载标签
    loadTags()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

// 加载可用标签
const loadTags = async () => {
  try {
    const res = await request({
      url: '/rating/tags',
      method: 'get'
    })
    
    if (res.code === '200') {
      availableTags.value = res.data || []
    }
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

// 处理标签选择
const handleTagChange = (tagName) => {
  const index = ratingForm.tags.indexOf(tagName)
  if (index > -1) {
    ratingForm.tags.splice(index, 1)
  } else {
    if (ratingForm.tags.length < 5) {
      ratingForm.tags.push(tagName)
    } else {
      ElMessage.warning('最多选择5个标签')
    }
  }
}

// 提交评价
const submitRating = async () => {
  await ratingFormRef.value.validate()
  
  loading.value = true
  try {
    const res = await request({
      url: '/rating/create',
      method: 'post',
      data: {
        yundanId: ratingForm.yundanId,
        rating: ratingForm.rating,
        tags: ratingForm.tags,
        comment: ratingForm.comment
      }
    })
    
    if (res.code === '200') {
      ElMessage.success('评价成功')
      visible.value = false
      emit('rating-success')
    } else {
      ElMessage.error(res.msg || '评价失败')
    }
  } catch (error) {
    ElMessage.error('提交评价失败')
  } finally {
    loading.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  ratingFormRef.value?.resetFields()
}

// 生命周期
onMounted(() => {
  // 预加载标签
  loadTags()
})
</script>

<style scoped>
.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-check-tag) {
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.el-check-tag.is-checked) {
  background-color: #409EFF;
  color: white;
}

:deep(.el-rate) {
  display: flex;
  align-items: center;
}

:deep(.el-rate__text) {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}
</style>