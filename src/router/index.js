import { createRouter,createWebHistory } from "vue-router";

const router=createRouter({
    history:createWebHistory(import.meta.env.BASE_URL),
    routes:[
        { path: '/', name: 'Login',meta:{title:'登录系统'}, component: () => import('../views/Login.vue') },
        { path: '/Register', name: 'Register', component: () => import('../views/Register.vue') },
        {path:'/Manger',name:'Manger',component:()=>import('../views/Manger.vue'), children:[
            {path:'homeView',name:'homeView',component:()=>import('../views/HomeView.vue')},
            {path:'Order',name:'Order',component:()=>import('../views/Order.vue')},
            {path:'Order_Manger',name:'Order_Manger',component:()=>import('../views/Order_Manger.vue')},
            {path:'self',name:'self',component:()=>import('../views/self.vue')},
            {
                path: '/chat/:yundanCode',
                name: 'Chat',
                component: () => import('../views/ChatWindow.vue'),
                meta: { title: '在线聊天' }
            }
        ]}
    ]
})

// 启用路由守卫
router.beforeEach((to, from, next) => {
    //to到哪儿  from从哪儿离开  next跳转 为空就是放行  
    if (to.path === '/'|| to.path==='/Register') {
        //如果跳转为登录和注册，就放行 
        next();    
    } else {
        //取出sessionStorage判断
        let token = sessionStorage.getItem('token');     	     
        if (token == null || token === '') { 
            console.log('请先登录')       
            next({name: 'Login'});
        } else {
            next();   
        }   
    }
});

export default router