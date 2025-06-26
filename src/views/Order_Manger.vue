<template>
  <div class="all">
      <div class="card" v-if="data.account.role === '配送员'">
        <el-table :data="data.cheliang" stripe size="large" >
        <el-table-column prop="code" label="车号" />
        <el-table-column prop="name" label="车辆名称" />
        <el-table-column prop="cheliangTypesName" label="车辆类型" />
        <el-table-column prop="content" label="车辆详情" />
        <el-table-column prop="weight" label="承重量(吨)" />
        <el-table-column prop="nowWeight" label="剩余重量（吨）" />
        <el-table-column prop="cheliangStatusTypesName" label="车辆状态" />
        </el-table>
        </div>
    <div class="card" style="margin-bottom: 5px;">
      <!-- <el-button type="primary" @click="search">查询</el-button> -->
      <el-button type="primary" @click="reset">重置</el-button>
        <el-button
              v-if="data.account.role === '配送员'"
              type="success"
              @click="startTransport()"
            >开始运输</el-button>
    </div>
    <div class="card">
      <el-table :data="data.yundan" stripe size="large">
        <el-table-column prop="code" label="单号" />
        <el-table-column prop="startAddr" label="出发地" />
        <el-table-column prop="endAddr" label="目的地" />
        <el-table-column prop="yundanName" label="收件人" />
        <el-table-column prop="yundanPhone" label="收件电话" />
        <el-table-column prop="yundanStatusName" label="订单状态" />
        <el-table-column fixed="right" label="操作" min-width="200">
          <template #default="scope">
            <el-button 
              v-if="data.account.role === '管理员'"
              type="primary"
              @click="openAssignDeliveryDialog(scope.row)"
              :disabled="scope.row.yundanStatusTypes !== 0"
            >安排车辆</el-button>
              <el-button
              v-if="data.account.role === '配送员'"
              type="info"
              @click="completeTransport(scope.row)"
              :disabled="scope.row.yundanStatusTypes !== 1"
            >运输完成</el-button>
            <el-button
              v-if="data.account.role === '配送员'"
              type="success"
              class="share-location-btn"
              @click="openShareLocationDialog(scope.row)"
              :disabled="scope.row.yundanStatusName !== '运输中'"
            >分享定位</el-button>
            
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-bottom: 15px;">
        <el-pagination
          @size-change="load"
          @current-change="load"
          v-model:current-page="data.pageNum"
          v-model:page-size="data.pageSize"
          :page-sizes="[5, 10, 15, 20, 30]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="data.total"
        />
      </div>
    </div>
    <!-- 分享定位对话框 -->
    <el-dialog title="分享定位" v-model="showShareLocationDialog" width="80%" @opened="initMap">
      <div id="amap" style="width: 100%; height: 600px;"></div>
      <el-form :model="locationForm" ref="locationFormRef">
        <el-form-item label="运单单号" prop="yundanId">
          <el-input v-model="locationForm.yundanId" disabled />
        </el-form-item>
        <el-form-item label="定位方式">
          <el-button type="primary" @click="getBrowserLocation">浏览器定位</el-button>
          <el-select
            v-model="searchKeyword"
            filterable
            remote
            :remote-method="searchPOI"
            placeholder="输入地址关键字搜索"
            style="width: 60%; margin-left: 10px;"
            @change="selectPOI"
          >
            <el-option
              v-for="poi in poiList"
              :key="poi.id"
              :label="poi.name + ' - ' + poi.address"
              :value="JSON.stringify({ lng: poi.location.lng, lat: poi.location.lat, name: poi.name })"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showShareLocationDialog = false">取消</el-button>
      </template>
       </el-dialog>
    <!-- 安排车辆对话框 -->
    <el-dialog title="安排车辆" v-model="showAssignDeliveryDialog" width="60%">
      <el-form :model="assignForm" ref="assignFormRef" label-width="100px">
        <el-form-item label="运单单号">
          <el-input v-model="assignForm.yundanId" disabled />
        </el-form-item>
        <el-form-item label="车辆" prop="cheliangId">
          <el-select v-model="assignForm.cheliangId" placeholder="请选择车辆" style="width: 100%;">
            <el-option
              v-for="cheliang in availableCheliangs"
              :key="cheliang.id"
              :label="`${cheliang.code} - ${cheliang.name} (剩余容量: ${cheliang.nowWeight}吨) - 司机: ${cheliang.sijiName} (电话：${cheliang.sijiPhone} 邮箱：${cheliang.sijiEmail})`"
              :value="cheliang.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAssignDeliveryDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAssignDelivery">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted,watch } from 'vue';
import { Search, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

// 高德地图 Key
const amapKey = '73eef78f0fd0ae3939d29c0f9f891ecc';
window._AMapSecurityConfig = {
  securityJsCode: 'a0636382e3bd394c061e4c1e2f5485c2',
};

// 数据状态
const data = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  formVisible: false,
  form: {},
  yundan: [],
  self_account: JSON.parse(localStorage.getItem('self-account') || '{}'),
  account: JSON.parse(localStorage.getItem('account') || '{}'),
  cheliang:[],
  cheliangStatus:null
});

// 地图相关变量
const map = ref(null);
const showShareLocationDialog = ref(false);
const locationForm = reactive({ yundanId: '' });
const searchKeyword = ref('');
const poiList = ref([]);
const startMarkers = ref([]);
const endMarkers = ref([]);
const polylines = ref([]);
const locationMarkers = ref([]);
const currentYundan = ref(null);

// 安排配送员相关变量
const showAssignDeliveryDialog = ref(false);
const assignForm = reactive({
  yundanId: '',
  cheliangId: null,
  sijiId: null,
  allweight: 0,
});
const assignFormRef = ref(null);
const availableCheliangs = ref([]);

// 打开安排车辆对话框
const openAssignDeliveryDialog = async (yundan) => {
  if (yundan.yundanStatusName !== "未分配") {
    ElMessage.warning('仅"未分配"状态的订单可安排配送员');
    return;
  }
  assignForm.yundanId = yundan.id;
  assignForm.allweight = yundan.allweight;
  try {
    const [cheliangRes, sijiRes] = await Promise.all([
      request({ url: '/yundan/availableCheliang', method: 'get' }),
    ]);
    if (cheliangRes.code === '200') {
      availableCheliangs.value = cheliangRes.data;

    } else {
      ElMessage.error('获取可用车辆失败');
    }
    showAssignDeliveryDialog.value = true;
  } catch (error) {
    ElMessage.error('加载数据失败，请检查网络');
    console.error('Error loading assign data:', error);
  }
};

// 提交安排车辆
const submitAssignDelivery = async () => {
  if (!assignForm.cheliangId) {
    ElMessage.error('请选择车辆');
    return;
  }
  
  // 从 availableCheliangs 中查找选中的车辆信息
  const selectedCheliang = availableCheliangs.value.find(
    item => item.id === assignForm.cheliangId
  );
  
  if (!selectedCheliang) {
    ElMessage.error('未找到选中的车辆信息');
    return;
  }
  
  if (!selectedCheliang.sijiId) {
    ElMessage.error('所选车辆没有关联司机，请重新选择');
    return;
  }
  
  try {
    const res = await request({
      url: '/yundan/assignDelivery',
      method: 'post',
      data: {
        yundanId: assignForm.yundanId,
        cheliangId: assignForm.cheliangId,
        allweight: assignForm.allweight,
        sijiId: selectedCheliang.sijiId, // 使用查找到的司机ID
      },
    });
    if (res.code === '200') {
      ElMessage.success('安排车辆成功');
      showAssignDeliveryDialog.value = false;
      load();
    } else {
      ElMessage.error(res.msg || '安排车辆失败');
    }
  } catch (error) {
    ElMessage.error('安排车辆失败，请检查网络');
    console.error('Error assigning delivery:', error);
  }
};

// 开始运输
const startTransport = async () => {
  ElMessageBox.confirm('确定开始运输吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const res = await request({
        url: '/yundan/startTransport?sijiId=' + data.self_account.id,
        method: 'post',
      });
      if (res.code === '200') {
        ElMessage.success('开始运输成功');
        load();
      } else {
        ElMessage.error(res.msg || '开始运输失败');
      }
    } catch (error) {
      ElMessage.error('开始运输失败，请检查网络');
      console.error('Error starting transport:', error);
    }
  }).catch(() => {
    ElMessage.info('已取消开始运输');
  });
};

// 运输完成
const completeTransport = async (yundan) => {
  if (yundan.yundanStatusTypes !== 1) {
    ElMessage.warning('仅“运输中”状态的订单可标记为运输完成');
    return;
  }
  ElMessageBox.confirm('确定标记为运输完成吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const res = await request({
        url: `/yundan/completeTransport?yundanId=${yundan.id}&sijiId=${yundan.sijiId}&allWeight=${yundan.allweight}`,
        method: 'post',
      });
      if (res.code === '200') {
        ElMessage.success('运输完成成功');
         load();
        if(data.account.role=='配送员'){
        load2();
       }
       console.log(yundan.allweight);
      } else {
        ElMessage.error(res.msg || '运输完成失败');
      }
    } catch (error) {
      ElMessage.error('运输完成失败，请检查网络');
      console.error('Error completing transport:', error);
    }
  }).catch(() => {
    ElMessage.info('已取消运输完成');
  });
};

//重置车辆状态
const resetcheliang = (vehicle) => {
  console.log('重置车辆', vehicle);
  // 重置车辆的逻辑
  request({
    url: '/cheliang/resetCheliangStatus',
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    params: {
      id: data.cheliang[0].id,
    },
  }).then(res => {
    if (res.code === '200') {
      ElMessage.success('重置车辆成功');
    } else {
      ElMessage.warning(res.msg || '充值错误');
    }
  }).catch(error => {
    ElMessage.error('加载运单数据失败，请检查网络或后端服务');
    console.error('Error loading orders:', error);
  });
}

watch(() => data.cheliang, (newCheliangList) => {
  newCheliangList.forEach(vehicle => {
    if (vehicle.nowWeight === vehicle.weight&&data.cheliangStatus==="运输中") {
      resetcheliang(vehicle);
       load();
       if(data.account.role=='配送员'){
       load2();
  }
    }
  });
}, { deep: true });

// 动态加载高德地图 API
const loadAmapScript = () => {
  return new Promise((resolve, reject) => {
    if (typeof AMap !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Driving,AMap.Geolocation,AMap.PlaceSearch`;
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
    if (currentYundan.value) {
      await loadYundanTrack(currentYundan.value.code);
      await drawRoute(currentYundan.value);
    }
  } catch (error) {
    ElMessage.error('初始化地图失败，请检查网络或高德地图 Key');
    console.error('Map initialization error:', error);
  }
};

// 打开分享定位对话框
const openShareLocationDialog = (yundan) => {
  if (yundan.yundanStatusName !== '运输中') {
    ElMessage.warning('运单状态不符合条件，仅“运输中”状态可分享定位');
    return;
  }
  currentYundan.value = yundan;
  locationForm.yundanId = yundan.code;
  showShareLocationDialog.value = true;
};

// 加载运单轨迹
const loadYundanTrack = async (yundanId) => {
  try {
    const res = await request({
      url: '/geo/list',
      method: 'get',
      params: { yundanId },
    });
    if (res.code === '200' && res.data && res.data.length > 0) {
      locationMarkers.value.forEach(marker => marker.setMap(null));
      locationMarkers.value = [];
      const latestGeo = res.data[res.data.length - 1];
      const marker = new AMap.Marker({
        map: map.value,
        position: latestGeo.location.coordinates,
        icon: new AMap.Icon({
          size: new AMap.Size(36, 36),
          image: new URL('@/assets/images/cheliang.png', import.meta.url).href,
          imageSize: new AMap.Size(36, 36),
        }),
        offset: new AMap.Pixel(-18, -36),
        draggable: true,
      });
      marker.on('dragend', (e) => {
        const { lng, lat } = e.lnglat;
        saveLocation(lng, lat, '拖拽定位');
        updateRoute(lng, lat);
      });
      locationMarkers.value.push(marker);
      map.value.setCenter(latestGeo.location.coordinates);
    } else {
      ElMessage.info('暂无轨迹数据');
    }
  } catch (error) {
    ElMessage.error('加载轨迹失败，请检查网络或后端服务');
    console.error('Error loading track:', error);
  }
};

// 绘制运单路线（出发地 -> 最新定位点 -> 目的地）
const drawRoute = async (yundan) => {
  if (!yundan.startLng || !yundan.endLng || !yundan.startLat || !yundan.endLat) {
    ElMessage.warning(`运单 ${yundan.code} 缺少经纬度信息，跳过绘制`);
    return;
  }
  startMarkers.value.forEach(marker => marker.setMap(null));
  endMarkers.value.forEach(marker => marker.setMap(null));
  polylines.value.forEach(polyline => polyline.setMap(null));
  startMarkers.value = [];
  endMarkers.value = [];
  polylines.value = [];

  // 添加出发地和目的地标记
  const startMarker = new AMap.Marker({
    map: map.value,
    position: [yundan.startLng, yundan.startLat],
    icon: new AMap.Icon({
      size: new AMap.Size(32, 32),
      image: new URL('@/assets/images/start.png', import.meta.url).href,
      imageSize: new AMap.Size(32, 32),
    }),
    offset: new AMap.Pixel(-16, -16),
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
  });
  endMarkers.value.push(endMarker);

  // 获取最新定位点
  let midPoint = null;
  try {
    const res = await request({
      url: '/geo/list',
      method: 'get',
      params: { yundanId: yundan.code },
    });
    if (res.code === '200' && res.data && res.data.length > 0) {
      const latestGeo = res.data[res.data.length - 1];
      midPoint = latestGeo.location.coordinates;
    }
  } catch (error) {
    console.error('Error fetching track for route:', error);
  }

  // 规划路线：出发地 -> 最新定位点（如果存在） -> 目的地
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
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const path = [];
          const route = result.routes[0];
          route.steps.forEach((step) => {
            step.path.forEach((point) => {
              path.push([point.lng, point.lat]);
            });
          });
          const polyline = new AMap.Polyline({
            map: map.value,
            path: path,
            strokeColor: getRandomColor(),
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: 'solid',
          });
          polylines.value.push(polyline);
          console.log(`Successfully drew route for order ${yundan.code}`);
          map.value.setFitView();
        } else {
          const polyline = new AMap.Polyline({
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
          polylines.value.push(polyline);
          ElMessage.warning(`运单 ${yundan.code} 路线规划失败，已绘制直线`);
          console.error(`Route planning failed for order ${yundan.code}:`, result);
          map.value.setFitView();
        }
      }
    );
  });
};

// 更新路线（出发地 -> 新定位点 -> 目的地）
const updateRoute = async (lng, lat) => {
  if (!currentYundan.value || !currentYundan.value.endLng || !currentYundan.value.endLat) {
    ElMessage.warning('运单缺少终点信息，无法更新路线');
    return;
  }
  polylines.value.forEach(polyline => polyline.setMap(null));
  polylines.value = [];

  AMap.plugin(['AMap.Driving'], () => {
    const driving = new AMap.Driving({
      map: map.value,
      policy: AMap.DrivingPolicy.LEAST_DISTANCE,
      hideMarkers: true,
    });
    driving.search(
      new AMap.LngLat(currentYundan.value.startLng, currentYundan.value.startLat),
      new AMap.LngLat(currentYundan.value.endLng, currentYundan.value.endLat),
      { waypoints: [new AMap.LngLat(lng, lat)] },
      (status, result) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const path = [];
          const route = result.routes[0];
          route.steps.forEach((step) => {
            step.path.forEach((point) => {
              path.push([point.lng, point.lat]);
            });
          });
          const polyline = new AMap.Polyline({
            map: map.value,
            path: path,
            strokeColor: getRandomColor(),
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: 'solid',
          });
          polylines.value.push(polyline);
          console.log(`Route updated for order ${currentYundan.value.code}`);
          map.value.setFitView();
        } else {
          const polyline = new AMap.Polyline({
            map: map.value,
            path: [
              [currentYundan.value.startLng, currentYundan.value.startLat],
              [lng, lat],
              [currentYundan.value.endLng, currentYundan.value.endLat],
            ],
            strokeColor: getRandomColor(),
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: 'dashed',
          });
          polylines.value.push(polyline);
          ElMessage.warning(`路线更新失败，已绘制直线`);
          console.error(`Route update failed:`, result);
          map.value.setFitView();
        }
      }
    );
  });
};

// 浏览器定位
const getBrowserLocation = async () => {
  if (!locationForm.yundanId) {
    ElMessage.error('运单单号不能为空');
    return;
  }
  AMap.plugin(['AMap.Geolocation'], () => {
    const geolocation = new AMap.Geolocation({
      showMarker: true,
      showCircle: true,
      circleOptions: {
        strokeColor: '#0093FF',
        noSelect: true,
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: '#02B0FF',
        fillOpacity: 0.25,
      },
      markerOptions: {
        icon: new AMap.Icon({
          size: new AMap.Size(36, 36),
          image: new URL('@/assets/images/cheliang.png', import.meta.url).href,
          imageSize: new AMap.Size(36, 36),
        }),
        offset: new AMap.Pixel(-18, -36),
        draggable: true,
      },
    });
    geolocation.getCurrentPosition((status, result) => {
      if (status === 'complete') {
        const { lng, lat } = result.position;
        saveLocation(lng, lat, '浏览器定位');
        addLocationMarker(lng, lat, true);
        updateRoute(lng, lat);
        map.value.setCenter([lng, lat]);
      } else {
        ElMessage.error('获取定位失败，请检查浏览器定位权限');
        console.error('Geolocation error:', result);
      }
    });
  });
};

// POI 搜索
const searchPOI = async (keyword) => {
  if (!locationForm.yundanId) {
    ElMessage.error('运单单号不能为空');
    return;
  }
  if (!keyword) {
    poiList.value = [];
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
          poiList.value = result.poiList.pois;
          console.log('POI search results:', poiList.value);
        } else {
          poiList.value = [];
          ElMessage.error('未找到相关地址，请尝试其他关键字');
          console.error('POI search error:', result);
        }
      });
    });
  } catch (error) {
    ElMessage.error('地址搜索失败，请检查网络或高德地图服务');
    console.error('POI search error:', error);
  }
};

// 选择 POI 地址
const selectPOI = (value) => {
  if (!value) return;
  const { lng, lat, name } = JSON.parse(value);
  saveLocation(lng, lat, `POI 搜索: ${name}`);
  addLocationMarker(lng, lat, true);
  updateRoute(lng, lat);
  map.value.setCenter([lng, lat]);
  searchKeyword.value = '';
  poiList.value = [];
};

// 添加定位点标记
const addLocationMarker = (lng, lat, draggable = false) => {
  locationMarkers.value.forEach(marker => marker.setMap(null));
  locationMarkers.value = [];
  const marker = new AMap.Marker({
    map: map.value,
    position: [lng, lat],
    icon: new AMap.Icon({
      size: new AMap.Size(36, 36),
      image: new URL('@/assets/images/cheliang.png', import.meta.url).href,
      imageSize: new AMap.Size(36, 36),
    }),
    offset: new AMap.Pixel(-18, -36),
    draggable,
  });
  if (draggable) {
    marker.on('dragend', (e) => {
      const { lng, lat } = e.lnglat;
      saveLocation(lng, lat, '拖拽定位');
      updateRoute(lng, lat);
    });
  }
  locationMarkers.value.push(marker);
};

// 保存定位数据到后端
const saveLocation = async (lng, lat, status) => {
  try {
    const geoData = {
      yundanId: locationForm.yundanId,
      sijiId: data.self_account.id,
      status,
      location: { type: 'Point', coordinates: [lng, lat] },
    };
    const res = await request({
      url: '/geo/save',
      method: 'post',
      data: geoData,
    });
    if (res.code === '200') {
      ElMessage.success('定位数据保存成功');
      await loadYundanTrack(locationForm.yundanId);
    } else {
      ElMessage.error(res.msg || '保存定位数据失败');
    }
  } catch (error) {
    ElMessage.error('保存定位数据失败，请检查网络或后端服务');
    console.error('Error saving location:', error);
  }
};

// 分页查询运单
const load = () => {
  request({
    url: '/yundan/findPageBySijiId',
    method: 'get',
    headers: { 'Content-Type': 'application/json' },
    params: {
      pageNum: data.pageNum,
      pageSize: data.pageSize,
      id: data.self_account.id,
      role:data.account.role
    },
  }).then(res => {
    if (res.code === '200') {
      data.yundan = res.data;
      data.total = res.total;
    } else {
      ElMessage.warning(res.msg || '暂无运单数据');
    }
  }).catch(error => {
    ElMessage.error('加载运单数据失败，请检查网络或后端服务');
    console.error('Error loading orders:', error);
  });
};
const load2 = () => {
  request({
    url: '/cheliang/findbySiji',
    method: 'get',
    headers: { 'Content-Type': 'application/json' },
    params: {
      sijiId: data.self_account.id,
    },
  }).then(res => {
    if (res.code === '200') {
      data.cheliang = res.data;
      data.cheliangStatus=res.data[0].cheliangStatusTypesName;
    } else {
      ElMessage.warning(res.msg || '暂无运单数据');
    }
  }).catch(error => {
    ElMessage.error('加载运单数据失败，请检查网络或后端服务');
    console.error('Error loading orders:', error);
  });
};
// 查询
const search = () => {
  data.pageNum = 1;
  load();
};

// 重置
const reset = () => {
 onMounted();
};



// 页面加载时查询运单
onMounted(() => {
  load();
  if(data.account.role=='配送员'){
    load2();
  }
});
</script>

<style scoped>
.all {
  position: relative;
  padding: 20px;
}
.card {
  padding: 10px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}
.share-location-btn {
  margin-left: 10px;
}
</style>