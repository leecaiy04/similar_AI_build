/**
 * 应用入口文件（无AI版本）
 *
 * 功能说明：
 * - 初始化Vue应用实例
 * - 注册Element Plus UI组件库
 * - 注册Vue Router路由（仅包含非AI功能）
 * - 挂载根组件到DOM
 */

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.no-ai.vue'
import router from './router/index.no-ai'

// 创建Vue应用实例
const app = createApp(App)

// 注册Element Plus组件库
app.use(ElementPlus)

// 注册路由
app.use(router)

// 挂载应用到#app元素
app.mount('#app')
