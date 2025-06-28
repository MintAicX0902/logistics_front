<template>
  <div class="performance-container">
    <!-- 绩效概览卡片 -->
    <div class="summary-cards">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon delivery">
                <el-icon><Van /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ summary.deliveryCount || 0 }}</div>
                <div class="card-label">本月配送单量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon distance">
                <el-icon><Location /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ formatNumber(summary.totalDistance) }}</div>
                <div class="card-label">本月总里程(km)</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon rating">
                <el-icon><Star /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ formatNumber(summary.avgRating, 2) }}</div>
                <div class="card-label">平均评分</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon rate">
                <el-icon><TrophyBase /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ formatNumber(summary.fiveStarRate, 1) }}%</div>
                <div class="card-label">五星好评率</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 查询条件 -->
    <el-card class="filter-card">
      <el-form :model="queryForm" inline>
        <el-form-item label="统计周期">
          <el-select v-model="queryForm.periodType" @change="handlePeriodTypeChange">
            <el-option label="日报" value="DAILY" />
            <el-option label="周报" value="WEEKLY" />
            <el-option label="月报" value="MONTHLY" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            @change="handleDateChange"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="loadPerformanceData" :loading="loading">
            查询
          </el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="generateReport" :loading="reportLoading">
            <el-icon style="margin-right: 5px;"><Download /></el-icon>
            生成报告
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图表展示区 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 趋势图 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>绩效趋势</span>
            </div>
          </template>
          <div id="trendChart" style="height: 400px;"></div>
        </el-card>
      </el-col>
      
      <!-- 评分分布 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>评分分布</span>
            </div>
          </template>
          <div id="ratingChart" style="height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 标签和词频分析 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 热门标签 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>热门评价标签</span>
            </div>
          </template>
          <div class="tag-cloud">
            <el-tag
              v-for="(tag, index) in summary.topTags"
              :key="index"
              :type="getTagType(index)"
              :size="getTagSize(index)"
              effect="plain"
              style="margin: 5px;"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      
      <!-- 评价词云 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>评价关键词</span>
            </div>
          </template>
          <div id="wordCloudChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细数据表格 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>绩效明细</span>
        </div>
      </template>
      
      <el-table :data="performanceList" stripe v-loading="loading">
        <el-table-column prop="periodDate" label="日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.periodDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="deliveryCount" label="配送单量" align="center" />
        <el-table-column prop="totalDistance" label="总里程(km)" align="center">
          <template #default="scope">
            {{ formatNumber(scope.row.totalDistance) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalWeight" label="总重量(吨)" align="center">
          <template #default="scope">
            {{ formatNumber(scope.row.totalWeight) }}
          </template>
        </el-table-column>
        <el-table-column prop="avgRating" label="平均评分" align="center">
          <template #default="scope">
            <el-rate
              v-model="scope.row.avgRating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="fiveStarRate" label="五星好评率" align="center">
          <template #default="scope">
            <el-progress
              :percentage="parseFloat(scope.row.fiveStarRate)"
              :color="getProgressColor(scope.row.fiveStarRate)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 评价列表 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>客户评价</span>
          <el-button text @click="loadRatings">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <div v-if="ratingList.length > 0">
        <div v-for="rating in ratingList" :key="rating.id" class="rating-item">
          <div class="rating-header">
            <span class="customer-name">{{ rating.yonghuName }}</span>
            <el-rate v-model="rating.rating" disabled />
            <span class="rating-time">{{ formatDateTime(rating.createTime) }}</span>
          </div>
          
          <div class="rating-tags" v-if="rating.tagList && rating.tagList.length > 0">
            <el-tag 
              v-for="tag in rating.tagList" 
              :key="tag" 
              size="small" 
              type="info"
              style="margin-right: 5px;"
            >
              {{ tag }}
            </el-tag>
          </div>
          
          <div class="rating-comment" v-if="rating.comment">
            {{ rating.comment }}
          </div>
          
          <el-divider />
        </div>
        
        <!-- 分页 -->
        <el-pagination
          v-model:current-page="ratingPage.pageNum"
          v-model:page-size="ratingPage.pageSize"
          :total="ratingPage.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadRatings"
          @current-change="loadRatings"
        />
      </div>
      
      <el-empty v-else description="暂无评价数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Van, Location, Star, TrophyBase, Download, Refresh } from '@element-plus/icons-vue'
import request from '@/utils/request'
import * as echarts from 'echarts'
import 'echarts-wordcloud'

// 数据状态
const loading = ref(false)
const reportLoading = ref(false)
const summary = reactive({
  deliveryCount: 0,
  totalDistance: 0,
  avgRating: 0,
  fiveStarRate: 0,
  totalWeight: 0,
  topTags: [],
  wordFrequency: {}
})

// 查询表单
const queryForm = reactive({
  periodType: 'DAILY',
  startDate: null,
  endDate: null,
  recentDays: 30
})

const dateRange = ref([])
const performanceList = ref([])

// 评价列表
const ratingList = ref([])
const ratingPage = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
})

// 图表实例
let trendChart = null
let ratingChart = null
let wordCloudChart = null

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

// 加载绩效数据
const loadPerformanceData = async () => {
  loading.value = true
  try {
    const res = await request({
      url: '/performance/query',
      method: 'post',
      data: queryForm
    })
    
    if (res.code === '200') {
      performanceList.value = res.data || []
      updateCharts()
    }
  } catch (error) {
    ElMessage.error('加载绩效数据失败')
  } finally {
    loading.value = false
  }
}

// 加载概览数据
const loadSummary = async () => {
  try {
    const res = await request({
      url: '/performance/summary',
      method: 'get'
    })
    
    if (res.code === '200') {
      Object.assign(summary, res.data)
      updateWordCloud()
    }
  } catch (error) {
    ElMessage.error('加载概览数据失败')
  }
}

// 加载评价列表
const loadRatings = async () => {
  try {
    const res = await request({
      url: '/rating/siji/list',
      method: 'get',
      params: {
        pageNum: ratingPage.pageNum,
        pageSize: ratingPage.pageSize
      }
    })
    
    if (res.code === '200') {
      ratingList.value = res.data.list || []
      ratingPage.total = res.data.total
    }
  } catch (error) {
    ElMessage.error('加载评价列表失败')
  }
}

// 生成报告
const generateReport = async () => {
  reportLoading.value = true
  try {
    const res = await request({
      url: '/performance/report/generate',
      method: 'post',
      data: queryForm
    })
    
    if (res.code === '200') {
      ElMessageBox.alert(
        `报告生成成功！<br><a href="${res.data}" target="_blank" style="color: #409EFF;">点击下载</a>`,
        '提示',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '确定'
        }
      )
    }
  } catch (error) {
    ElMessage.error('生成报告失败')
  } finally {
    reportLoading.value = false
  }
}

// 初始化图表
const initCharts = () => {
  trendChart = echarts.init(document.getElementById('trendChart'))
  ratingChart = echarts.init(document.getElementById('ratingChart'))
  wordCloudChart = echarts.init(document.getElementById('wordCloudChart'))
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    trendChart?.resize()
    ratingChart?.resize()
    wordCloudChart?.resize()
  })
}

// 更新图表
const updateCharts = () => {
  updateTrendChart()
  updateRatingChart()
}

// 更新趋势图
const updateTrendChart = () => {
  const dates = performanceList.value.map(item => formatDate(item.periodDate))
  const deliveryData = performanceList.value.map(item => item.deliveryCount)
  const distanceData = performanceList.value.map(item => parseFloat(item.totalDistance))
  const ratingData = performanceList.value.map(item => parseFloat(item.avgRating))
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['配送单量', '总里程', '平均评分']
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '单量/里程',
        position: 'left'
      },
      {
        type: 'value',
        name: '评分',
        position: 'right',
        max: 5,
        min: 0
      }
    ],
    series: [
      {
        name: '配送单量',
        type: 'bar',
        data: deliveryData,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '总里程',
        type: 'line',
        data: distanceData,
        smooth: true,
        itemStyle: {
          color: '#67C23A'
        }
      },
      {
        name: '平均评分',
        type: 'line',
        yAxisIndex: 1,
        data: ratingData,
        smooth: true,
        itemStyle: {
          color: '#E6A23C'
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 更新评分分布图
const updateRatingChart = () => {
  if (!summary.ratingDistribution || summary.ratingDistribution.length === 0) return
  
  const data = summary.ratingDistribution.map(item => ({
    value: item.count,
    name: `${item.star}星`
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '评分分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  }
  
  ratingChart.setOption(option)
}

// 更新词云图
const updateWordCloud = () => {
  if (!summary.wordFrequency || Object.keys(summary.wordFrequency).length === 0) return
  
  const data = Object.entries(summary.wordFrequency).map(([word, count]) => ({
    name: word,
    value: count
  }))
  
  const option = {
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '80%',
      height: '80%',
      sizeRange: [12, 60],
      rotationRange: [-90, 90],
      rotationStep: 45,
      gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: function () {
          return 'rgb(' + [
            Math.round(Math.random() * 160),
            Math.round(Math.random() * 160),
            Math.round(Math.random() * 160)
          ].join(',') + ')'
        }
      },
      data: data
    }]
  }
  
  wordCloudChart.setOption(option)
}

// 处理统计周期变化
const handlePeriodTypeChange = () => {
  // 根据周期类型调整默认时间范围
  const now = new Date()
  let start = new Date()
  
  switch (queryForm.periodType) {
    case 'DAILY':
      start.setDate(now.getDate() - 30)
      break
    case 'WEEKLY':
      start.setDate(now.getDate() - 90)
      break
    case 'MONTHLY':
      start.setMonth(now.getMonth() - 12)
      break
  }
  
  dateRange.value = [start, now]
  handleDateChange()
}

// 处理日期变化
const handleDateChange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    queryForm.startDate = dateRange.value[0]
    queryForm.endDate = dateRange.value[1]
  }
}

// 重置查询
const resetQuery = () => {
  queryForm.periodType = 'DAILY'
  queryForm.startDate = null
  queryForm.endDate = null
  queryForm.recentDays = 30
  dateRange.value = []
  loadPerformanceData()
}

// 工具函数
const formatNumber = (val, decimals = 2) => {
  if (!val) return '0'
  return parseFloat(val).toFixed(decimals)
}

const formatDate = (date) => {
  if (!date) return ''
  
  let dateObj
  
  if (typeof date === 'string') {
    dateObj = new Date(date.includes(' ') ? date.replace(' ', 'T') : date)
  } else if (Array.isArray(date)) {
    dateObj = new Date(date[0], date[1] - 1, date[2])
  } else {
    dateObj = new Date(date)
  }
  
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date)
    return ''
  }
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

const formatDateTime = (datetime) => {
  if (!datetime) return ''
  
  // 处理不同的日期格式
  let date
  
  // 如果是时间戳
  if (typeof datetime === 'number') {
    date = new Date(datetime)
  } 
  // 如果是字符串
  else if (typeof datetime === 'string') {
    // 处理 "2024-01-01T10:00:00" 格式
    if (datetime.includes('T')) {
      date = new Date(datetime)
    } 
    // 处理 "2024-01-01 10:00:00" 格式
    else if (datetime.includes(' ')) {
      // 将空格替换为T，使其符合ISO格式
      date = new Date(datetime.replace(' ', 'T'))
    }
    // 处理其他格式
    else {
      date = new Date(datetime)
    }
  }
  // 如果是数组格式 [2024, 1, 1, 10, 0, 0]
  else if (Array.isArray(datetime)) {
    // LocalDateTime 数组格式：[year, month, day, hour, minute, second]
    date = new Date(datetime[0], datetime[1] - 1, datetime[2], 
                   datetime[3] || 0, datetime[4] || 0, datetime[5] || 0)
  }
  // 如果已经是Date对象
  else if (datetime instanceof Date) {
    date = datetime
  }
  else {
    return 'Invalid Date'
  }
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', datetime)
    return 'Invalid Date'
  }
  
  // 格式化输出
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const getTagType = (index) => {
  const types = ['primary', 'success', 'info', 'warning', 'danger']
  return types[index % types.length]
}

const getTagSize = (index) => {
  if (index === 0) return 'large'
  if (index <= 2) return 'default'
  return 'small'
}

const getProgressColor = (percentage) => {
  if (percentage >= 90) return '#67C23A'
  if (percentage >= 70) return '#409EFF'
  if (percentage >= 50) return '#E6A23C'
  return '#F56C6C'
}

// 生命周期
onMounted(async () => {
  await nextTick()
  initCharts()
  await Promise.all([
    loadSummary(),
    loadPerformanceData(),
    loadRatings()
  ])
})
</script>

<style scoped>
.performance-container {
  padding: 20px;
}

.summary-cards {
  margin-bottom: 20px;
}

.summary-card {
  transition: all 0.3s;
}

.summary-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-right: 20px;
}

.card-icon.delivery {
  background: #E6F2FF;
  color: #409EFF;
}

.card-icon.distance {
  background: #E8F5E9;
  color: #67C23A;
}

.card-icon.rating {
  background: #FFF3E0;
  color: #E6A23C;
}

.card-icon.rate {
  background: #FDE2E2;
  color: #F56C6C;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.card-label {
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag-cloud {
  padding: 20px;
  text-align: center;
}

.rating-item {
  padding: 15px 0;
}

.rating-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.customer-name {
  font-weight: bold;
  color: #303133;
}

.rating-time {
  color: #909399;
  font-size: 14px;
  margin-left: auto;
}

.rating-tags {
  margin-bottom: 10px;
}

.rating-comment {
  color: #606266;
  line-height: 1.6;
  padding: 10px;
  background: #F5F7FA;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .card-content {
    flex-direction: column;
    text-align: center;
  }
  
  .card-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }
}
</style>