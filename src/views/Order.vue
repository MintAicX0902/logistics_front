<template>
  <div class="all">
    <div class="card">
      <!-- 顶部操作栏 -->
      <div class="header">
        <el-button type="primary" class="create-order-btn" @click="openCreateOrderDialog">创建订单</el-button>
      </div>
      <!-- 地图容器 -->
      <div id="amap" style="width: 100%; height: 900px;"></div>
    </div>
    <!-- 创建订单对话框 -->
    <el-dialog title="创建订单" v-model="showCreateOrderDialog" width="50%">
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
            <el-table-column prop="name" label="货物名称">
              <template #default="scope">
                <el-input v-model="scope.row.name" placeholder="请输入货物名称" />
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="重量（吨）">
              <template #default="scope">
                <el-input v-model.number="scope.row.weight" placeholder="请输入重量" type="number" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="danger" @click="removeHuowu(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" style="margin-top: 10px;" @click="addHuowu">添加货物</el-button>
        </el-form-item>
        <el-form-item label="运费（元）" prop="cost">
          <el-input v-model="yundanForm.cost" disabled />
          <el-button type="primary" style="margin-left: 10px;" @click="calculateCost">计算运费</el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { reactive } from 'vue';
import request from '../utils/request';

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
const huowuList = ref([{ name: '', weight: null }]);
const cachedAddresses = ref([]);

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
          // 绑定点击事件显示运单信息
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
    map.value.setFitView();
  } catch (error) {
    ElMessage.error('加载运单数据失败');
    console.error(error);
  }
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
        // 绑定点击事件放大并居中轨迹
        polyline.on('click', () => {
          const center = midPoint || [(yundan.startLng + yundan.endLng) / 2, (yundan.startLat + yundan.endLat) / 2];
          map.value.setZoomAndCenter(15, center);
        });
        polylines.value.push(polyline);
        map.value.setFitView();
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
      // 自动填充最新地址
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
  // 验证输入
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
              const distance = route.distance / 1000; // 转换为公里
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
  huowuList.value.push({ name: '', weight: null });
};

// 删除货物
const removeHuowu = (index) => {
  if (huowuList.value.length === 1) {
    ElMessage.warning('至少保留一个货物');
    return;
  }
  huowuList.value.splice(index, 1);
};

// 提交订单
const submitYundan = async () => {
  try {
    await yundanFormRef.value.validate();
    if (huowuList.value.some(item => !item.name || !item.weight || item.weight <= 0)) {
      ElMessage.error('请填写完整的货物信息，且重量需大于0');
      return;
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
      yundanFormRef.value.resetFields();
      huowuList.value = [{ name: '', weight: null }];
      yundanForm.cost = null;
      await loadYundanData();
    } else {
      ElMessage.error(response.msg || '订单创建失败');
    }
  } catch (error) {
    ElMessage.error('订单创建失败，请检查网络');
    console.error('提交订单失败:', error);
  }
};

// 页面挂载时初始化地图
onMounted(() => {
  initMap();
});
</script>

<style scoped>
.all {
  position: relative;
  height: 100vh;
}
.card {
  padding: 10px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header {
  margin-bottom: 10px;
  text-align: right;
}
.create-order-btn {
  float: right;
}
</style>