import axios from "axios";  
import { ElMessage } from "element-plus";  
import router from '../router';

const request = axios.create({  
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:8080',
    timeout: 30000  
});  

request.interceptors.request.use(config => {  
    console.log('=== 拦截器被调用 ===');
    console.log('请求 URL:', config.url);
    console.log('请求方法:', config.method);
    
    const noTokenUrls = ['/user/login', '/user/register', '/user/findByUsername'];
    
    if (!noTokenUrls.includes(config.url)) {
        const token = sessionStorage.getItem('token');  
        console.log('sessionStorage 中的 token:', token ? token.substring(0, 20) + '...' : '空');
        
        if (token) {   
            config.headers['token'] = token;
            console.log('已设置 token 到请求头');
        } else {
            console.warn('sessionStorage 中没有找到 token');
        }
    } else {
        console.log('跳过 token 设置，因为是登录相关接口');
    }
    
    // 处理content-type
    if (config.data instanceof FormData) {
        console.log('检测到 FormData，删除 Content-Type');
        delete config.headers['Content-Type'];
    } else if (config.headers['Content-Type'] === undefined) {
        config.headers['Content-Type'] = 'application/json;charset=utf-8';
    }
    
    console.log('最终请求头:', config.headers);
    console.log('=== 拦截器处理完成 ===');
    
    return config;  
}, error => {  
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);  
});

request.interceptors.response.use(  
    response => {  
        let res = response.data;  
        if (typeof res === 'string') {  
            try {  
                res = res ? JSON.parse(res) : res;  
            } catch (e) {  
                console.error('JSON parse error:', e);  
                ElMessage.error('响应数据格式错误');  
                return Promise.reject(e);  
            }  
        }
        
        // 处理401未授权
        if (res.code === '401') {
            ElMessage.error('登录已过期，请重新登录');
            sessionStorage.removeItem('token');
            localStorage.removeItem('account');
            localStorage.removeItem('self-account');
            router.push('/');
            return Promise.reject(new Error('未授权'));
        }
        
        return res;  
    },  
    error => {  
        if (error.response) {  
            if (error.response.status === 404) {  
                ElMessage.error('未找到接口');  
            } else if (error.response.status === 401) {  
                ElMessage.error('未授权，请重新登录');  
                sessionStorage.removeItem('token');
                localStorage.removeItem('account');
                localStorage.removeItem('self-account');
                router.push('/');
            } else if (error.response.status === 500) {  
                ElMessage.error('系统异常，请查看后端控制台报错');  
            } else {  
                ElMessage.error(`请求失败: ${error.response.status}`);  
            }  
        } else {  
            console.error(error.message);  
            ElMessage.error('网络连接失败');
        }  
        return Promise.reject(error);  
    }  
);

export default request;