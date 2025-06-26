import { createApp } from 'vue'
import router from './router/index'
import App from './App.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import component from 'element-plus/es/components/tree-select/src/tree-select-option.mjs';
const app = createApp(App);
// 引用ElementPlus
app.use(ElementPlus, {
    locale: zhCn,
});

// 使用路由
app.use(router);

// 引用组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}
app.mount('#app');


