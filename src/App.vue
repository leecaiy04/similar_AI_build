<template>
  <el-config-provider :locale="zhCn">
    <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <!-- Global Header with Navigation (Draggable in Tauri) -->
      <header data-tauri-drag-region class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-0 flex justify-between items-center shadow-sm z-20 h-12 shrink-0 select-none">
        <div data-tauri-drag-region class="flex items-center gap-6">
          <h1 data-tauri-drag-region class="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap cursor-default">
            鏅鸿兘鏂囨湰鍒嗘瀽
          </h1>
          <!-- Navigation Tabs -->
          <nav class="flex items-center gap-1 h-12">
            <router-link 
              v-for="tab in navTabs" 
              :key="tab.name" 
              :to="tab.path"
              class="nav-tab group relative flex items-center gap-1.5 px-4 h-full text-sm font-medium transition-colors"
              :class="$route.name === tab.name 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'"
            >
              <span class="text-base pointer-events-none">{{ tab.icon }}</span>
              <span class="pointer-events-none">{{ tab.label }}</span>
              <!-- Active indicator -->
              <span 
                v-if="$route.name === tab.name"
                class="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              ></span>
            </router-link>
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <el-button circle @click="toggleTheme" class="!bg-transparent border-gray-200 dark:border-gray-700 hover:!bg-gray-100 dark:hover:!bg-gray-700" size="small">
             {{ isDark ? '馃尀' : '馃寵' }}
          </el-button>
        </div>
      </header>
      
      <!-- Route Content -->
      <div class="flex-1 overflow-hidden">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const isDark = ref(false)

const navTabs = [
    { name: 'similarity', path: '/', label: '鐩镐技搴︽瘮瀵', icon: '馃攳' },
    { name: 'diff', path: '/diff', label: '鏁版嵁Diff', icon: '鈿' },
    { name: 'process', path: '/process', label: '鏁版嵁澶勭悊', icon: '鈿欙笍' },
    { name: 'aibatch', path: '/ai-batch', label: '鎵归噺AI', icon: '馃' },
]

const toggleTheme = () => {
    isDark.value = !isDark.value
    if (isDark.value) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

onMounted(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark.value = true
        document.documentElement.classList.add('dark')
    }
})
</script>

<style>
/* Navigation Tab Styles */
.nav-tab {
    text-decoration: none;
}

/* Page Transition */
.page-fade-enter-active,
.page-fade-leave-active {
    transition: opacity 0.15s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
    opacity: 0;
}
</style>
