<template>
  <div class="all">
    <div class="card">
      <!-- 顶部操作栏 -->
      <div class="header">
        <el-button type="primary" class="create-order-btn" @click="openCreateOrderDialog">创建订单</el-button>
        <el-button type="success" @click="showOrderList = !showOrderList">
          {{ showOrderList ? '隐藏订单列表' : '显示订单列表' }}
        </el-button>
      </div>
      
      <!-- 运单列表区域 -->
      <div v-if="showOrderList" class="order-list-section" style="margin-bottom: 20px;">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>我的运单列表</span>
              <el-button class="button" text @click="loadYundanData">刷新</el-button>
            </div>
          </template>
          
          <el-table :data="data.yundanList" style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="code" label="运单号" width="200" />
            <el-table-column prop="startAddr" label="出发地" width="200" />
            <el-table-column prop="endAddr" label="目的地" width="200" />
            <el-table-column prop="yundanName" label="收货人" width="120" />
            <el-table-column prop="allweight" label="重量(吨)" width="100" />
            <el-table-column prop="yundanStatusName" label="运单状态" width="120">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.yundanStatusTypes)">
                  {{ scope.row.yundanStatusName }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="paymentStatus" label="支付状态" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.paymentStatus === 'PAID' ? 'success' : 'warning'">
                  {{ scope.row.paymentStatus === 'PAID' ? '已支付' : '未支付' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDateTime(scope.row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button 
                  v-if="scope.row.paymentStatus === 'UNPAID'"
                  type="primary" 
                  size="small" 
                  @click="openPaymentDialog(scope.row)"
                  :icon="Wallet"
                >
                  立即支付
                </el-button>
                <el-tag v-else type="success" size="small">
                  <el-icon><Check /></el-icon>
                  支付完成
                </el-tag>
                <el-button 
                  type="info" 
                  size="small" 
                  @click="viewOrderDetail(scope.row)"
                  :icon="View"
                  style="margin-left: 10px;"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div style="margin-top: 20px; text-align: center;" v-if="data.yundanList.length > 0">
            <el-pagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </div>

      <!-- 地图容器 -->
      <div id="amap" style="width: 100%; height: 600px;"></div>
    </div>

    <!-- 创建订单对话框 -->
    <el-dialog title="创建订单" v-model="showCreateOrderDialog" width="60%">
      <el-form :model="yundanForm" ref="yundanFormRef" :rules="yundanRules" label-width="100px">
        <el-form-item label="出发地" prop="startAddr">
          <el-select
            v-model="yundanForm.startAddr"
            filterable
            remote
            :remote-method="searchStartPOI"
            placeholder="输入出发地关键字搜索"
            style="width: 80%;"
            @change="selectStartPOI"
          >
            <el-option
              v-for="poi in startPoiList"
              :key="poi.id"
              :label="poi.name + ' - ' + poi.address"
              :value="JSON.stringify({ lng: poi.location.lng, lat: poi.location.lat, name: poi.name, address: poi.address })"
            />
            <el-option
              v-for="addr in cachedAddresses"
              :key="addr.startAddr + ':' + addr.endAddr"
              :label="addr.startAddr"
              :value="JSON.stringify({ lng: addr.startLng, lat: addr.startLat, address: addr.startAddr })"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="目的地" prop="endAddr">
          <el-select
            v-model="yundanForm.endAddr"
            filterable
            remote
            :remote-method="searchEndPOI"
            placeholder="输入目的地关键字搜索"
            style="width: 80%;"
            @change="selectEndPOI"
          >
            <el-option
              v-for="poi in endPoiList"
              :key="poi.id"
              :label="poi.name + ' - ' + poi.address"
              :value="JSON.stringify({ lng: poi.location.lng, lat: poi.location.lat, name: poi.name, address: poi.address })"
            />
            <el-option
              v-for="addr in cachedAddresses"
              :key="addr.startAddr + ':' + addr.endAddr"
              :label="addr.endAddr"
              :value="JSON.stringify({ lng: addr.endLng, lat: addr.endLat, address: addr.endAddr })"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="收件人姓名" prop="yundanName">
          <el-input v-model="yundanForm.yundanName" placeholder="请输入收件人姓名" />
        </el-form-item>
        
        <el-form-item label="收件人电话" prop="yundanPhone">
          <el-input v-model="yundanForm.yundanPhone" placeholder="请输入收件人电话" />
        </el-form-item>
        
        <el-form-item label="货物信息">
          <el-table :data="huowuList" style="width: 100%;">
            <el-table-column prop="name" label="货物名称" width="200">
              <template #default="scope">
                <el-input v-model="scope.row.name" placeholder="请输入货物名称" />
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="重量（吨）" width="150">
              <template #default="scope">
                <el-input v-model.number="scope.row.weight" placeholder="请输入重量" type="number" />
              </template>
            </el-table-column>
            <el-table-column label="货物图片" width="200">
              <template #default="scope">
                <div class="upload-container">
                  <!-- 已上传的图片 -->
                  <div v-if="scope.row.imageUrl" class="image-preview">
                    <el-image
                      :src="scope.row.imageUrl"
                      :preview-src-list="[scope.row.imageUrl]"
                      fit="cover"
                      style="width: 80px; height: 80px;"
                    />
                    <el-icon class="delete-icon" @click="removeImage(scope.$index)">
                      <Close />
                    </el-icon>
                  </div>
                  <!-- 上传按钮 -->
                  <el-upload
                    v-else
                    class="upload-btn"
                    :action="uploadUrl"
                    :headers="uploadHeaders"
                    :show-file-list="false"
                    :on-success="(res, file) => handleUploadSuccess(res, file, scope.$index)"
                    :on-error="handleUploadError"
                    :before-upload="beforeUpload"
                    accept="image/*"
                  >
                    <el-button type="primary" size="small">
                      <el-icon style="margin-right: 5px;"><Upload /></el-icon>
                      上传图片
                    </el-button>
                  </el-upload>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeHuowu(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" style="margin-top: 10px;" @click="addHuowu">添加货物</el-button>
        </el-form-item>
        <el-form-item label="运费（元）" prop="cost">
          <el-row :gutter="10" align="middle">
            <el-col :span="16">
              <el-input 
                v-model="yundanForm.cost" 
                disabled 
                placeholder="请点击计算按钮"
              >
                <template #suffix>
                  <span style="color: #909399;">元</span>
                </template>
              </el-input>
            </el-col>
            <el-col :span="8">
              <el-button 
                type="primary" 
                @click="calculateCost" 
                style="width: 100%;"
              >
                计算运费
              </el-button>
            </el-col>
          </el-row>
          <!-- <div style="margin-top: 5px; font-size: 12px; color: #909399;">
            运费 = 总重量 × 运输距离 × 0.5元/吨·公里
          </div> -->
        </el-form-item>
      </el-form>
      
      <!-- 最近使用地址 -->
      <div v-if="cachedAddresses.length > 0" style="margin-top: 20px;">
        <h4>最近使用地址</h4>
        <el-table :data="cachedAddresses.slice(0, 3)" style="width: 100%;">
          <el-table-column prop="startAddr" label="出发地" />
          <el-table-column prop="endAddr" label="目的地" />
          <el-table-column prop="yundanName" label="收件人姓名" />
          <el-table-column prop="yundanPhone" label="收件人电话" />
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button type="primary" size="small" @click="useCachedAddress(scope.row)">使用</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="showCreateOrderDialog = false">取消</el-button>
        <el-button type="primary" @click="submitYundan">提交</el-button>
      </template>
    </el-dialog>

    <!-- 支付弹窗 -->
    <PaymentDialog 
      v-model="showPaymentDialog" 
      :order-info="currentOrder"
      @payment-success="handlePaymentSuccess"
    />

    <!-- 订单详情弹窗 -->
    <el-dialog title="运单详情" v-model="showDetailDialog" width="70%">
      <el-descriptions :column="2" border v-if="currentOrder.code">
        <el-descriptions-item label="运单号">{{ currentOrder.code }}</el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="currentOrder.paymentStatus === 'PAID' ? 'success' : 'warning'">
            {{ currentOrder.paymentStatus === 'PAID' ? '已支付' : '未支付' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="出发地">{{ currentOrder.startAddr }}</el-descriptions-item>
        <el-descriptions-item label="目的地">{{ currentOrder.endAddr }}</el-descriptions-item>
        <el-descriptions-item label="收货人">{{ currentOrder.yundanName }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentOrder.yundanPhone }}</el-descriptions-item>
        <el-descriptions-item label="货物重量">{{ currentOrder.allweight }} 吨</el-descriptions-item>
        <el-descriptions-item label="运单状态">
          <el-tag :type="getStatusTagType(currentOrder.yundanStatusTypes)">
            {{ currentOrder.yundanStatusName }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDateTime(currentOrder.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="配送员" v-if="currentOrder.sijiName">
          {{ currentOrder.sijiName }}
        </el-descriptions-item>
        <el-descriptions-item label="配送员电话" v-if="currentOrder.sijiPhone">
          {{ currentOrder.sijiPhone }}
        </el-descriptions-item>
        <el-descriptions-item label="车辆编号" v-if="currentOrder.cheliangCode">
          {{ currentOrder.cheliangCode }}
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- 货物详情表格 -->
      <div style="margin-top: 20px;" v-if="currentOrderHuowu.length > 0">
        <h4 style="margin-bottom: 10px;">货物明细</h4>
        <el-table :data="currentOrderHuowu" border style="width: 100%;">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="货物名称" min-width="150" />
          <el-table-column prop="weight" label="重量（吨）" width="100" align="center" />
          <el-table-column label="货物图片" width="120" align="center">
            <template #default="scope">
              <el-image
                v-if="scope.row.imageUrl"
                :src="scope.row.imageUrl"
                :preview-src-list="[scope.row.imageUrl]"
                fit="cover"
                style="width: 80px; height: 80px; cursor: pointer;"
                preview-teleported
              >
                <template #error>
                  <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f5f7fa;">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <span v-else style="color: #909399;">暂无图片</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Wallet, Check, View, Upload, Close, Picture } from '@element-plus/icons-vue';
import request from '../utils/request';
import PaymentDialog from '../components/PaymentDialog.vue';

// 高德地图 Key
const amapKey = '73eef78f0fd0ae3939d29c0f9f891ecc';
window._AMapSecurityConfig = {
  securityJsCode: 'a0636382e3bd394c061e4c1e2f5485c2',
};

// 用户数据和运单列表
const data = reactive({
  self_account: JSON.parse(localStorage.getItem('self-account') || '{}'),
  yundanList: [],
});

// 地图相关变量
const map = ref(null);
const startMarkers = ref([]);
const endMarkers = ref([]);
const polylines = ref([]);
const locationMarkers = ref([]);
const showCreateOrderDialog = ref(false);

// 支付相关
const showPaymentDialog = ref(false);
const currentOrder = ref({});
const showDetailDialog = ref(false);

// 列表显示控制
const showOrderList = ref(true);
const tableLoading = ref(false);

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 订单表单
const yundanForm = reactive({
  startAddr: '',
  endAddr: '',
  startLng: null,
  startLat: null,
  endLng: null,
  endLat: null,
  yundanName: '',
  yundanPhone: '',
  cost: null,
});

const yundanRules = {
  startAddr: [{ required: true, message: '请输入出发地', trigger: 'change' }],
  endAddr: [{ required: true, message: '请输入目的地', trigger: 'change' }],
  yundanName: [{ required: true, message: '请输入收件人姓名', trigger: 'blur' }],
  yundanPhone: [
    { required: true, message: '请输入收件人电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码', trigger: 'blur' },
  ],
};

const yundanFormRef = ref(null);
const startPoiList = ref([]);
const endPoiList = ref([]);
const cachedAddresses = ref([]);

// 货物列表 - 包含imageUrl字段
const huowuList = ref([{ name: '', weight: null, imageUrl: '' }]);

// 查看订单详情相关
const currentOrderHuowu = ref([]);

// 上传相关配置
const uploadUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return baseUrl + '/file/upload/huowu';
});

const uploadHeaders = computed(() => {
  const token = sessionStorage.getItem('token');
  return token ? { 'token': token } : {};
});

// 动态加载高德地图 API
const loadAmapScript = () => {
  return new Promise((resolve, reject) => {
    if (typeof AMap !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Driving,AMap.PlaceSearch`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图 API 加载失败'));
    document.head.appendChild(script);
  });
};

// 生成随机颜色
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// 初始化高德地图
const initMap = async () => {
  try {
    await loadAmapScript();
    if (typeof AMap === 'undefined') {
      ElMessage.error('高德地图 API 未定义，请检查网络或 Key 配置');
      return;
    }
    map.value = new AMap.Map('amap', {
      resizeEnable: true,
      center: [106.665655, 26.444562],
      zoom: 11,
      mapStyle: 'amap://styles/normal',
    });
    await loadYundanData();
  } catch (error) {
    ElMessage.error('初始化地图失败');
    console.error(error);
  }
};

// 加载用户的所有运单数据并绘制轨迹
const loadYundanData = async () => {
  try {
    if (!data.self_account.id) {
      ElMessage.error('未检测到用户信息，请先登录');
      return;
    }
    
    tableLoading.value = true;
    const response = await request({
      url: '/yundan/findByYonghuId',
      method: 'post',
      params: { yonghuId: data.self_account.id },
    });
    
    if (response.code !== '200') {
      ElMessage.warning('暂无运单数据');
      return;
    }
    
    data.yundanList = response.data || [];
    pagination.total = data.yundanList.length;
    
    console.log('前端接收到的运单数据:', data.yundanList);

    // 为运单数据添加支付状态和状态名称
    data.yundanList.forEach(yundan => {
      console.log(`运单 ${yundan.code} 的支付状态:`, yundan.paymentStatus);
      
      if (!yundan.paymentStatus) {
        yundan.paymentStatus = 'UNPAID';
      }
      yundan.yundanStatusName = getStatusText(yundan.yundanStatusTypes);
      // 添加运费信息
      if (!yundan.cost) {
        getYundanCost(yundan);
      }
    });
    
    // 清除地图标记
    if (map.value) {
      map.value.clearMap();
      startMarkers.value = [];
      endMarkers.value = [];
      polylines.value = [];
      locationMarkers.value = [];

      for (const yundan of data.yundanList) {
        if (yundan.yundanStatusName !== '运输中' || yundan.sijiId == null) {
          continue;
        }
        if (!yundan.startLng || !yundan.endLng || !yundan.startLat || !yundan.endLat) {
          ElMessage.warning(`运单 ${yundan.code} 缺少经纬度信息，跳过绘制`);
          continue;
        }

        const startMarker = new AMap.Marker({
          map: map.value,
          position: [yundan.startLng, yundan.startLat],
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: new URL('@/assets/images/start.png', import.meta.url).href,
            imageSize: new AMap.Size(32, 32),
          }),
          offset: new AMap.Pixel(-16, -16),
          title: `起点: ${yundan.startAddr}`,
        });
        startMarkers.value.push(startMarker);

        const endMarker = new AMap.Marker({
          map: map.value,
          position: [yundan.endLng, yundan.endLat],
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: new URL('@/assets/images/end.png', import.meta.url).href,
            imageSize: new AMap.Size(32, 32),
          }),
          offset: new AMap.Pixel(-16, -16),
          title: `终点: ${yundan.endAddr}`,
        });
        endMarkers.value.push(endMarker);

        let midPoint = null;
        let locationMarker = null;
        try {
          const res = await request({
            url: '/geo/list',
            method: 'get',
            params: { yundanId: yundan.code },
          });
          if (res.code === '200' && res.data && res.data.length > 0) {
            const latestGeo = res.data[res.data.length - 1];
            midPoint = latestGeo.location.coordinates;
            locationMarker = new AMap.Marker({
              map: map.value,
              position: midPoint,
              icon: new AMap.Icon({
                size: new AMap.Size(36, 36),
                image: new URL('@/assets/images/cheliang.png', import.meta.url).href,
                imageSize: new AMap.Size(36, 36),
              }),
              offset: new AMap.Pixel(-18, -36),
              title: `最新定位: ${latestGeo.status} (${new Date(latestGeo.time).toLocaleString()})`,
            });
            locationMarker.on('click', () => {
              const infoWindow = new AMap.InfoWindow({
                content: `
                  <div style="padding: 10px; background: #fff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <h4>运单信息</h4>
                    <p><strong>单号:</strong> ${yundan.code}</p>
                    <p><strong>配送员姓名:</strong> ${yundan.sijiName || '未知'}</p>
                    <p><strong>配送员电话:</strong> ${yundan.sijiPhone || '未知'}</p>
                    <p><strong>车辆编号:</strong> ${yundan.cheliangCode || '未知'}</p>
                  </div>
                `,
                offset: new AMap.Pixel(0, -40),
              });
              infoWindow.open(map.value, midPoint);
            });
            locationMarkers.value.push(locationMarker);
          }
        } catch (error) {
          console.error(`获取运单 ${yundan.code} 轨迹失败:`, error);
        }

        drawRoute(yundan, midPoint, locationMarker);
      }
      
      if (map.value) {
        map.value.setFitView();
      }
    }
  } catch (error) {
    ElMessage.error('加载运单数据失败');
    console.error(error);
  } finally {
    tableLoading.value = false;
  }
};

// 获取运单费用
const getYundanCost = async (yundan) => {
  try {
    const response = await request({
      url: '/feiyong/getByYundanId',
      method: 'get',
      params: { yundanId: yundan.id }
    });
    if (response.code === '200' && response.data) {
      yundan.cost = response.data.cost;
    }
  } catch (error) {
    console.error('获取运费失败:', error);
  }
};

// 打开支付弹窗
const openPaymentDialog = (order) => {
  currentOrder.value = { ...order };
  showPaymentDialog.value = true;
};

// 支付成功处理
const handlePaymentSuccess = () => {
  ElMessage.success('支付成功！');
  loadYundanData(); // 刷新运单列表
};

// 查看订单详情
const viewOrderDetail = async (order) => {
  currentOrder.value = { ...order };
  currentOrderHuowu.value = [];
  showDetailDialog.value = true;
  
  // 获取货物详情
  try {
    const res = await request({
      url: '/huowu/findByYundanId',
      method: 'get',
      params: { yundanId: order.id }
    });
    
    if (res.code === '200' && res.data) {
      currentOrderHuowu.value = res.data;
    }
  } catch (error) {
    console.error('获取货物详情失败:', error);
  }
};

// 获取状态标签类型
const getStatusTagType = (status) => {
  switch (status) {
    case 0: return 'info';    // 未分配
    case 1: return 'warning'; // 运输中
    case 2: return 'success'; // 已完成
    case 4: return 'primary'; // 已安排
    default: return 'info';
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 0: return '未分配';
    case 1: return '运输中';
    case 2: return '已完成';
    case 4: return '已安排';
    default: return '未知状态';
  }
};

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  
  // 处理数组格式的时间 [2025, 6, 26, 21, 8, 40]
  if (Array.isArray(dateTime)) {
    const [year, month, day, hour, minute, second] = dateTime;
    const date = new Date(year, month - 1, day, hour, minute, second || 0);
    return date.toLocaleString('zh-CN');
  }
  
  // 处理字符串格式的时间
  const date = new Date(dateTime);
  return date.toLocaleString('zh-CN');
};

// 分页处理
const handleSizeChange = (val) => {
  pagination.pageSize = val;
  loadYundanData();
};

const handleCurrentChange = (val) => {
  pagination.currentPage = val;
  loadYundanData();
};

// 绘制运单路线
const drawRoute = (yundan, midPoint, locationMarker) => {
  AMap.plugin(['AMap.Driving'], () => {
    const driving = new AMap.Driving({
      map: map.value,
      policy: AMap.DrivingPolicy.LEAST_DISTANCE,
      hideMarkers: true,
    });
    driving.search(
      new AMap.LngLat(yundan.startLng, yundan.startLat),
      new AMap.LngLat(yundan.endLng, yundan.endLat),
      { waypoints: midPoint ? [new AMap.LngLat(midPoint[0], midPoint[1])] : [] },
      (status, result) => {
        let polyline;
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const path = [];
          const route = result.routes[0];
          route.steps.forEach((step) => {
            step.path.forEach((point) => {
              path.push([point.lng, point.lat]);
            });
          });
          polyline = new AMap.Polyline({
            map: map.value,
            path: path,
            strokeColor: getRandomColor(),
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: 'solid',
          });
        } else {
          polyline = new AMap.Polyline({
            map: map.value,
            path: [
              [yundan.startLng, yundan.startLat],
              ...(midPoint ? [midPoint] : []),
              [yundan.endLng, yundan.endLat],
            ],
            strokeColor: getRandomColor(),
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: 'dashed',
          });
          ElMessage.warning(`运单 ${yundan.code} 路线规划失败，已绘制直线`);
          console.error(`运单 ${yundan.code} 路线规划失败:`, result);
        }
        polyline.on('click', () => {
          const center = midPoint || [(yundan.startLng + yundan.endLng) / 2, (yundan.startLat + yundan.endLat) / 2];
          map.value.setZoomAndCenter(15, center);
        });
        polylines.value.push(polyline);
        if (map.value) {
          map.value.setFitView();
        }
      }
    );
  });
};

// 加载缓存地址
const loadCachedAddresses = async () => {
  try {
    const res = await request({
      url: '/address/cache',
      method: 'get',
      params: { yonghuId: data.self_account.id },
    });
    if (res.code === '200') {
      cachedAddresses.value = res.data || [];
      if (cachedAddresses.value.length > 0) {
        const latestAddr = cachedAddresses.value[0];
        yundanForm.startAddr = latestAddr.startAddr;
        yundanForm.endAddr = latestAddr.endAddr;
        yundanForm.yundanName = latestAddr.yundanName;
        yundanForm.yundanPhone = latestAddr.yundanPhone;
        yundanForm.startLng = latestAddr.startLng;
        yundanForm.startLat = latestAddr.startLat;
        yundanForm.endLng = latestAddr.endLng;
        yundanForm.endLat = latestAddr.endLat;
      }
    }
  } catch (error) {
    console.error('加载缓存地址失败:', error);
  }
};

// 打开创建订单对话框
const openCreateOrderDialog = async () => {
  await loadCachedAddresses();
  showCreateOrderDialog.value = true;
};

// POI 搜索 - 出发地
const searchStartPOI = async (keyword) => {
  if (!keyword) {
    startPoiList.value = [];
    return;
  }
  try {
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({
        city: '贵阳',
        pageSize: 10,
        pageIndex: 1,
      });
      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
          startPoiList.value = result.poiList.pois;
        } else {
          startPoiList.value = [];
        }
      });
    });
  } catch (error) {
    console.error('出发地 POI 搜索失败:', error);
  }
};

// POI 搜索 - 目的地
const searchEndPOI = async (keyword) => {
  if (!keyword) {
    endPoiList.value = [];
    return;
  }
  try {
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({
        city: '贵阳',
        pageSize: 10,
        pageIndex: 1,
      });
      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
          endPoiList.value = result.poiList.pois;
        } else {
          endPoiList.value = [];
        }
      });
    });
  } catch (error) {
    console.error('目的地 POI 搜索失败:', error);
  }
};

// 选择出发地
const selectStartPOI = (value) => {
  if (!value) return;
  const { lng, lat, address } = JSON.parse(value);
  yundanForm.startAddr = address;
  yundanForm.startLng = lng;
  yundanForm.startLat = lat;
  startPoiList.value = [];
};

// 选择目的地
const selectEndPOI = (value) => {
  if (!value) return;
  const { lng, lat, address } = JSON.parse(value);
  yundanForm.endAddr = address;
  yundanForm.endLng = lng;
  yundanForm.endLat = lat;
  endPoiList.value = [];
};

// 使用缓存地址
const useCachedAddress = (addr) => {
  yundanForm.startAddr = addr.startAddr;
  yundanForm.endAddr = addr.endAddr;
  yundanForm.yundanName = addr.yundanName;
  yundanForm.yundanPhone = addr.yundanPhone;
  yundanForm.startLng = addr.startLng;
  yundanForm.startLat = addr.startLat;
  yundanForm.endLng = addr.endLng;
  yundanForm.endLat = addr.endLat;
};

// 计算运费
const calculateCost = async () => {
  if (!yundanForm.startAddr || !yundanForm.endAddr) {
    ElMessage.error('请填写出发地和目的地');
    return;
  }
  if (!yundanForm.startLng || !yundanForm.endLng || !yundanForm.startLat || !yundanForm.endLat) {
    ElMessage.error('请确保出发地和目的地有有效的经纬度');
    return;
  }
  if (huowuList.value.some(item => !item.name || !item.weight || item.weight <= 0)) {
    ElMessage.error('请填写完整的货物信息，且重量需大于0');
    return;
  }
  try {
    const allweight = huowuList.value.reduce((sum, item) => sum + Number(item.weight), 0);
    const distance = await new Promise((resolve, reject) => {
      AMap.plugin(['AMap.Driving'], () => {
        const driving = new AMap.Driving({
          policy: AMap.DrivingPolicy.LEAST_DISTANCE,
        });
        driving.search(
          new AMap.LngLat(yundanForm.startLng, yundanForm.startLat),
          new AMap.LngLat(yundanForm.endLng, yundanForm.endLat),
          (status, result) => {
            if (status === 'complete' && result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              const distance = route.distance / 1000;
              resolve(distance);
            } else {
              reject(new Error('路线规划失败'));
            }
          }
        );
      });
    });
    const pricePerTonKm = 0.5;
    yundanForm.cost = (allweight * distance * pricePerTonKm).toFixed(2);
  } catch (error) {
    ElMessage.error('运费计算失败，请检查网络');
    console.error('运费计算失败:', error);
  }
};

// 添加货物
const addHuowu = () => {
  huowuList.value.push({ name: '', weight: null, imageUrl: '' });
};

// 删除货物
const removeHuowu = (index) => {
  if (huowuList.value.length === 1) {
    ElMessage.warning('至少保留一个货物');
    return;
  }
  huowuList.value.splice(index, 1);
};

// 图片上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error('只能上传图片文件！');
    return false;
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！');
    return false;
  }
  return true;
};

// 上传成功处理
const handleUploadSuccess = (response, file, huowuIndex) => {
  if (response.code === '200') {
    huowuList.value[huowuIndex].imageUrl = response.data;
    ElMessage.success('图片上传成功');
  } else {
    ElMessage.error(response.msg || '上传失败');
  }
};

// 上传失败处理
const handleUploadError = (err) => {
  ElMessage.error('图片上传失败，请重试');
  console.error('上传失败:', err);
};

// 删除图片
const removeImage = async (huowuIndex) => {
  try {
    await ElMessageBox.confirm('确定删除这张图片吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    const imageUrl = huowuList.value[huowuIndex].imageUrl;
    
    // 调用后端删除接口
    const res = await request({
      url: '/file/delete',
      method: 'delete',
      params: { fileUrl: imageUrl }
    });
    
    if (res.code === '200') {
      huowuList.value[huowuIndex].imageUrl = '';
      ElMessage.success('图片删除成功');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除图片失败:', error);
      ElMessage.error('删除失败，请重试');
    }
  }
};

// 提交订单
const submitYundan = async () => {
  try {
    await yundanFormRef.value.validate();
    
    // 验证货物信息
    if (huowuList.value.some(item => !item.name || !item.weight || item.weight <= 0)) {
      ElMessage.error('请填写完整的货物信息，且重量需大于0');
      return;
    }
    
    // 可选：验证是否所有货物都上传了图片
    const noImageItems = huowuList.value.filter(item => !item.imageUrl);
    if (noImageItems.length > 0) {
      const confirm = await ElMessageBox.confirm(
        `有 ${noImageItems.length} 个货物未上传图片，是否继续提交？`,
        '提示',
        {
          confirmButtonText: '继续提交',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).catch(() => false);
      
      if (!confirm) return;
    }
    
    if (!yundanForm.cost) {
      ElMessage.error('请先计算运费');
      return;
    }
    
    const yundan = {
      yonghuId: data.self_account.id,
      startAddr: yundanForm.startAddr,
      endAddr: yundanForm.endAddr,
      startLng: yundanForm.startLng,
      startLat: yundanForm.startLat,
      endLng: yundanForm.endLng,
      endLat: yundanForm.endLat,
      yundanName: yundanForm.yundanName,
      yundanPhone: yundanForm.yundanPhone,
      allweight: huowuList.value.reduce((sum, item) => sum + Number(item.weight), 0),
    };
    
    const response = await request({
      url: '/yundan/save',
      method: 'post',
      data: { yundan, huowuList: huowuList.value, cost: Number(yundanForm.cost) },
    });
    
    if (response.code === '200') {
      ElMessage.success('订单创建成功');
      showCreateOrderDialog.value = false;
      
      // 重置表单
      yundanFormRef.value.resetFields();
      huowuList.value = [{ name: '', weight: null, imageUrl: '' }];
      yundanForm.cost = null;
      
      await loadYundanData();
    } else {
      ElMessage.error(response.msg || '订单创建失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('订单创建失败，请检查网络');
      console.error('提交订单失败:', error);
    }
  }
};

const customUpload = async (options, huowuIndex) => {
  const { file, onProgress, onSuccess, onError } = options;
  const token = sessionStorage.getItem('token');  // 从 sessionStorage 获取
  
  if (!token) {
    ElMessage.error('请先登录');
    onError(new Error('未登录'));
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await request.post('/file/upload/huowu', formData, {
      headers: {
        'token': token,  // 使用 'token' 作为 header 名称
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress({ percent: percentCompleted });
      }
    });
    
    if (res.code === '200') {
      huowuList.value[huowuIndex].imageUrl = res.data;
      ElMessage.success('图片上传成功');
      onSuccess(res, file);
    } else {
      ElMessage.error(res.msg || '上传失败');
      onError(new Error(res.msg || '上传失败'));
    }
  } catch (error) {
    console.error('上传失败:', error);
    ElMessage.error('上传失败，请稍后重试');
    onError(error);
  }
};

// 页面挂载时初始化地图
onMounted(() => {
  initMap();
});
</script>

<style scoped>
.all {
  padding: 20px;
}

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.create-order-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.order-list-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-table {
  margin-bottom: 20px;
}

.el-tag {
  margin-right: 8px;
}

.el-button + .el-button {
  margin-left: 8px;
}

@media (max-width: 768px) {
  .all {
    padding: 10px;
  }
  
  .header {
    flex-direction: column;
    gap: 10px;
  }
}

/* 图片上传相关样式 */
.upload-container {
  display: flex;
  align-items: center;
}

.image-preview {
  position: relative;
  display: inline-block;
}

.image-preview .delete-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #f56c6c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  padding: 2px;
  display: none;
}

.image-preview:hover .delete-icon {
  display: block;
}

.upload-btn {
  display: inline-block;
}

/* 货物表格样式优化 */
.el-table .cell {
  padding: 8px 10px;
}
</style>