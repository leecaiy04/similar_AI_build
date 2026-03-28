/**
 * 路由配置
 * 
 * 页面说明：
 * - /         : 字符串相似度比对工具（原始主页）
 * - /diff     : 数据差异对比工具
 * - /process  : 页面数据处理 (查重去重提取等)
 * - /ai-batch : 批量AI请求工具 (OpenAI/Claude API)
 */

import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'similarity',
            component: () => import('../pages/SimilarityPage.vue'),
            meta: { title: '相似度比对', icon: '🔍' }
        },
        {
            path: '/diff',
            name: 'diff',
            component: () => import('../pages/DiffPage.vue'),
            meta: { title: '数据Diff', icon: '⚡' }
        },
        {
            path: '/process',
            name: 'process',
            component: () => import('../pages/DataProcessingPage.vue'),
            meta: { title: '数据处理', icon: '⚙️' }
        },
        {
            path: '/ai-batch',
            name: 'aibatch',
            component: () => import('../pages/AIBatchPage.vue'),
            meta: { title: '批量AI', icon: '🤖' }
        }
    ]
})

router.beforeEach((to) => {
    document.title = `${to.meta.title || '工具'} - 智能文本分析`
})

export default router
