<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Action Header Toolbar -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 shrink-0 shadow-sm z-10 text-sm">
      <!-- Row 1: Duplicate Management -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-bold text-gray-500 w-16 text-right">重复处理</span>
        <el-button-group>
          <el-button size="small" type="primary" plain @click="highlightDuplicates">高亮重复 (S)</el-button>
          <el-button size="small" type="info" plain @click="clearHighlights">清高亮 (C)</el-button>
          <el-button size="small" type="success" plain @click="countDuplicates">统计次数 (N)</el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" :type="preventDuplicates ? 'warning' : 'default'" @click="togglePreventDuplicates">
            {{ preventDuplicates ? '已开启拦截' : '拦截重复 (L)' }}
          </el-button>
          <el-button size="small" type="default" @click="clearPreventDuplicates" :disabled="!preventDuplicates">
            清拦截 (R)
          </el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" type="danger" plain @click="removeDuplicates">删除重复 (D)</el-button>
          <el-button size="small" type="warning" plain @click="extractNumbers">取有效数字</el-button>
        </el-button-group>
        
        <div class="flex-1"></div>
        <el-button size="small" type="danger" text @click="clearAll" icon="Delete">清空所有</el-button>
      </div>

      <!-- Row 2: Text Transformation -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-bold text-gray-500 w-16 text-right">基础处理</span>
        <el-button-group>
          <el-button size="small" @click="trimSpaces">去首尾空</el-button>
          <el-button size="small" @click="removeEmpty">除空行</el-button>
          <el-button size="small" @click="sortData('asc')">升序 ↑</el-button>
          <el-button size="small" @click="sortData('desc')">降序 ↓</el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" @click="convertCase('lower')">全小写</el-button>
          <el-button size="small" @click="convertCase('upper')">全大写</el-button>
        </el-button-group>

        <span class="text-xs font-bold text-gray-500 ml-4">正则操作</span>
        <div class="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1 py-1">
          <el-input v-model="regexPattern" size="small" placeholder="如 \d{3,} 或 ^A.*" class="w-40 !mx-0" clearable />
          <el-button size="small" type="primary" plain @click="applyRegex('match')">提取匹配</el-button>
          <el-button size="small" type="danger" plain @click="applyRegex('filter')">删除匹配行</el-button>
          <el-button size="small" type="success" plain @click="applyRegex('keep')">保留匹配行</el-button>
        </div>
      </div>

      <!-- Row 3: Premium Tools -->
      <div class="flex flex-wrap gap-2 items-center mt-2 border-t border-gray-100 dark:border-gray-800 pt-3">
        <span class="text-xs font-bold text-amber-500 w-16 text-right">高级功能</span>
        
        <!-- Find & Replace -->
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
          <el-input v-model="findText" size="small" placeholder="查找内容" class="w-24 !mx-0" clearable />
          <el-input v-model="replaceText" size="small" placeholder="替换为" class="w-24 !mx-0" clearable />
          <el-button size="small" type="warning" plain @click="batchReplace" class="!border-amber-300">批量替换</el-button>
        </div>

        <!-- Prefix / Suffix -->
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
          <el-input v-model="prefixText" size="small" placeholder="统一前缀" class="w-24 !mx-0" clearable />
          <el-input v-model="suffixText" size="small" placeholder="统一后缀" class="w-24 !mx-0" clearable />
          <el-button size="small" type="warning" plain @click="addFixes" class="!border-amber-300">追加</el-button>
        </div>

        <!-- Masking & Spilt & Extract -->
        <el-button-group>
           <el-dropdown trigger="click" @command="handleExtract">
              <el-button size="small" type="warning" plain>智能提取 ▼</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="phone">📱 提取手机号</el-dropdown-item>
                  <el-dropdown-item command="email">✉️ 提取邮箱</el-dropdown-item>
                  <el-dropdown-item command="url">🔗 提取超链接</el-dropdown-item>
                  <el-dropdown-item command="idcard">🪪 提取身份证(18位)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>
           <el-dropdown trigger="click" @command="handleMask">
              <el-button size="small" type="warning" plain>隐私脱敏 ▼</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="phone">138****1234 手机号</el-dropdown-item>
                  <el-dropdown-item command="idcard">110105******1234 身份证</el-dropdown-item>
                  <el-dropdown-item command="name">李*明 (基于行首文本)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>
        </el-button-group>
        
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
           <el-input v-model="splitChar" size="small" placeholder="如逗号/分号等" class="w-24 !mx-0" clearable />
           <el-button size="small" type="warning" plain @click="splitToRows" class="!border-amber-300">拆分为多行</el-button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Data Input / Editor -->
      <div class="flex-1 p-4 overflow-hidden flex flex-col">
        <div class="flex justify-between items-center mb-2 px-1">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            数据处理工作区
            <el-tag size="small" type="info" round class="font-mono scale-90">{{ dataList.length }} 行</el-tag>
          </label>
          <el-button size="small" type="primary" plain @click="copyAllData" :disabled="dataList.length === 0">
             一键复制 (完美还原回 Excel)
          </el-button>
        </div>

        <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div class="flex justify-between items-center mb-2">
               <span class="text-xs text-gray-500 font-bold tracking-widest uppercase">追加数据输入区</span>
               <el-radio-group v-model="splitMode" size="small">
                 <el-radio-button value="newline">按行分隔</el-radio-button>
                 <el-radio-button value="blankline">按空行分隔(支持多行数据)</el-radio-button>
               </el-radio-group>
            </div>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="在此粘贴多行文本数据，或直接输入后点击添加..."
              resize="none"
              class="custom-textarea"
              @keydown.enter.prevent="addTypedData"
            />
            <div class="mt-2 flex justify-end">
              <el-button size="small" type="primary" @click="addTypedData">追加数据到列表 (Enter)</el-button>
            </div>
          </div>

          <!-- Virtual/Rendered List -->
          <div class="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
            <div v-if="dataList.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 select-none pb-12">
               <div class="text-5xl mb-4 text-gray-200 dark:text-gray-700">📋</div>
               <p class="text-sm font-medium">暂无数据</p>
               <p class="text-xs mt-1">在上方输入框粘贴内容并追加</p>
            </div>

            <div v-else class="space-y-1">
              <div 
                v-for="(item, index) in dataList" 
                :key="item.id"
                class="group flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
                :class="[
                  item.isHighlighted 
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50' 
                    : 'bg-gray-50/50 border-transparent hover:border-gray-200 dark:bg-gray-900/50 dark:hover:border-gray-700'
                ]"
              >
                <!-- Row Number & Content -->
                <div class="flex items-center gap-3 overflow-hidden">
                   <div class="w-6 text-right shrink-0">
                     <span class="text-[10px] font-mono text-gray-400 select-none">{{ index + 1 }}</span>
                   </div>
                   <div class="font-mono text-sm truncate" :class="item.isHighlighted ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-gray-700 dark:text-gray-300'">
                     {{ item.value }}
                   </div>
                </div>

                <!-- Status Tags & Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <el-tag v-if="item.count > 1" type="danger" size="small" effect="plain" round class="scale-90 font-mono">
                    重复 {{ item.count }} 次
                  </el-tag>
                  <el-button type="danger" link icon="Delete" size="small" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeRow(index)"></el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { splitTextData } from '../utils/textParser'

// Data structure for each row
interface DataRow {
  id: string;
  value: string;
  isHighlighted: boolean;
  count: number;
}

const dataList = ref<DataRow[]>([])
const inputText = ref('')
const regexPattern = ref('')

const findText = ref('')
const replaceText = ref('')
const prefixText = ref('')
const suffixText = ref('')
const splitChar = ref('')
const splitMode = ref('newline')

// Global Settings
const preventDuplicates = ref(false)

// Persistence Key
const STORAGE_KEY = 'premium_data_proc_v1'

/**
 * ID Generator
 */
const generateId = () => Math.random().toString(36).substr(2, 9)

/**
 * Handle new data input (Split by newline and add)
 */
const addTypedData = () => {
    if (!inputText.value.trim()) return

    const rawLines = splitTextData(inputText.value, splitMode.value as any)
    const newLines = rawLines.map(s => s.trim()).filter(Boolean)
    const existingValues = new Set(dataList.value.map(item => item.value))
    
    let addedCount = 0
    let rejectedCount = 0

    newLines.forEach(line => {
        if (preventDuplicates.value && existingValues.has(line)) {
            rejectedCount++
        } else {
            dataList.value.push({
                id: generateId(),
                value: line,
                isHighlighted: false,
                count: 0
            })
            existingValues.add(line)
            addedCount++
        }
    })

    inputText.value = ''
    
    if (preventDuplicates.value && rejectedCount > 0) {
        ElMessage.warning(`成功添加 ${addedCount} 行，拒绝录入重复项 ${rejectedCount} 行`)
    } else if (addedCount > 0) {
        ElMessage.success(`成功添加 ${addedCount} 行`)
    }
}

/**
 * (S) 设置高亮重复项
 */
const highlightDuplicates = () => {
    const counts = new Map<string, number>()
    dataList.value.forEach(item => {
        counts.set(item.value, (counts.get(item.value) || 0) + 1)
    })
    
    let highlightCount = 0
    dataList.value.forEach(item => {
        if ((counts.get(item.value) || 0) > 1) {
            item.isHighlighted = true
            highlightCount++
        } else {
            item.isHighlighted = false
        }
    })
    
    if (highlightCount > 0) {
        ElMessage.success(`已高亮 ${highlightCount} 个重复出现的条目`)
    } else {
        ElMessage.info('未发现重复项')
    }
}

/**
 * (C) 清除高亮重复项
 */
const clearHighlights = () => {
    dataList.value.forEach(item => {
        item.isHighlighted = false
    })
    ElMessage.success('已清除高亮')
}

/**
 * (N) 统计重复次数
 */
const countDuplicates = () => {
    const counts = new Map<string, number>()
    dataList.value.forEach(item => {
        counts.set(item.value, (counts.get(item.value) || 0) + 1)
    })
    
    dataList.value.forEach(item => {
        item.count = counts.get(item.value) || 1
    })
    ElMessage.success('统计完成，结果已在右侧显示')
}

/**
 * (L) 拒绝录入重复项
 */
const togglePreventDuplicates = () => {
    preventDuplicates.value = !preventDuplicates.value
    if (preventDuplicates.value) {
        ElMessage.warning('已开启：后续新增数据若与现有数据重复将被拦截拦截')
    } else {
        ElMessage.info('已关闭重复录入验证')
    }
}

/**
 * (R) 清除拒绝录入限制
 */
const clearPreventDuplicates = () => {
    preventDuplicates.value = false
    ElMessage.success('已清除拒绝录入限制')
}

/**
 * (D) 删除重复项
 */
const removeDuplicates = () => {
    const seen = new Set<string>()
    const originalLength = dataList.value.length
    
    dataList.value = dataList.value.filter(item => {
        if (seen.has(item.value)) {
            return false
        }
        seen.add(item.value)
        return true
    })
    
    const removedCount = originalLength - dataList.value.length
    if (removedCount > 0) {
        ElMessage.success(`已清理去重，共删除 ${removedCount} 行重复数据`)
    } else {
        ElMessage.info('未发现需要删除的重复项')
    }
    
    // 如果之前统计过次数，去重后重置次数
    dataList.value.forEach(item => {
        item.count = 0
        item.isHighlighted = false
    })
}

/**
 * 取有效数字
 */
const extractNumbers = () => {
    let extractedCount = 0
    dataList.value.forEach(item => {
        // 匹配带小数点和负号的数字序列
        const nums = item.value.match(/-?\d+(\.\d+)?/g)
        if (nums && nums.length > 0) {
            // 将所有提取出的数字连起来，或取第一个
            const newVal = nums.join('') // 或者 nums[0]取决于需求，默认全拼接
            if (newVal !== item.value) {
                item.value = newVal
                extractedCount++
                // 清楚之前的高亮状态
                item.isHighlighted = false
                item.count = 0
            }
        } else {
             // 如果没含任何有效数字的情况是否置空？用户常规理解“取有效数字”，无数字的话就置空
             if (item.value !== '') {
                 item.value = ''
                 extractedCount++
                 item.isHighlighted = false
                 item.count = 0
             }
        }
    })
    
    // 过滤掉完全变为空的选项，或者保留为空行，这里保守选择保留为空行（如果用户想要去除空行可以另做）
    // 为了界面整洁，把去重成完全为空白的顺手剔除
    dataList.value = dataList.value.filter(item => item.value !== '')

    ElMessage.success(`智能提取完成，影响 ${extractedCount} 行`)
}

/**
 * 去首尾空格
 */
const trimSpaces = () => {
    let count = 0
    dataList.value.forEach(item => {
        const trimmed = item.value.trim()
        if (item.value !== trimmed) {
            item.value = trimmed
            count++
        }
    })
    ElMessage.success(`已处理 ${count} 行`)
}

/**
 * 除空行
 */
const removeEmpty = () => {
    const originalLen = dataList.value.length
    dataList.value = dataList.value.filter(item => item.value.trim() !== '')
    const removedStr = originalLen - dataList.value.length
    ElMessage.success(`删除了 ${removedStr} 个空行`)
}

/**
 * 排序
 */
const sortData = (dir: 'asc'|'desc') => {
    dataList.value.sort((a, b) => {
        if (dir === 'asc') return a.value.localeCompare(b.value)
        return b.value.localeCompare(a.value)
    })
    ElMessage.success(dir === 'asc' ? '已升序排列' : '已降序排列')
}

/**
 * 大小写转换
 */
const convertCase = (c: 'lower'|'upper') => {
    dataList.value.forEach(item => {
        item.value = c === 'lower' ? item.value.toLowerCase() : item.value.toUpperCase()
    })
    ElMessage.success(`已转换为${c === 'lower' ? '小写' : '大写'}`)
}

/**
 * 正则相关操作
 */
const applyRegex = (action: 'match' | 'filter' | 'keep') => {
    if (!regexPattern.value) {
        ElMessage.warning('请输入正则表达式')
        return
    }
    
    let regex: RegExp
    try {
        regex = new RegExp(regexPattern.value, 'g')
    } catch (e) {
        ElMessage.error('正则表达式语法错误')
        return
    }

    let affectedCount = 0

    if (action === 'match') {
        let newList: DataRow[] = []
        dataList.value.forEach(item => {
            const matches = item.value.match(regex)
            if (matches && matches.length > 0) {
                // 如果一条包含多个匹配，可以选择连接，或者分多行，这里先合并显示
                newList.push({ ...item, value: matches.join(' '), isHighlighted: false, count: 0 })
                affectedCount++
            }
        })
        dataList.value = newList
        ElMessage.success(`提取完成，提取了 ${affectedCount} 行有效数据`)
    } else if (action === 'filter') {
        const preLen = dataList.value.length
        dataList.value = dataList.value.filter(item => !regex.test(item.value))
        affectedCount = preLen - dataList.value.length
        ElMessage.success(`删除了 ${affectedCount} 个匹配行`)
    } else if (action === 'keep') {
        const preLen = dataList.value.length
        dataList.value = dataList.value.filter(item => regex.test(item.value))
        affectedCount = preLen - dataList.value.length
        ElMessage.success(`删除了 ${affectedCount} 个不匹配行`)
    }
}

/**
 * 高级功能：批量替换
 */
const batchReplace = () => {
    if (!findText.value) return
    let count = 0
    dataList.value.forEach(item => {
        if(item.value.includes(findText.value)) {
            item.value = item.value.split(findText.value).join(replaceText.value)
            count++
        }
    })
    ElMessage.success(`完成替换，共影响 ${count} 行`)
}

/**
 * 高级功能：加前后缀
 */
const addFixes = () => {
   if (!prefixText.value && !suffixText.value) return
   dataList.value.forEach(item => {
      item.value = prefixText.value + item.value + suffixText.value
   })
   ElMessage.success('已批量追加固定前缀后缀')
}

/**
 * 高级功能：智能特定类型数据提取
 */
const handleExtract = (type: string | number | object) => {
    // Dropdown command provides string in this case
    if (typeof type !== 'string') return
    let regex: RegExp | null = null
    if (type === 'phone') regex = /1[3-9]\d{9}/g
    else if (type === 'email') regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    else if (type === 'url') regex = /https?:\/\/[^\s]+/g
    else if (type === 'idcard') regex = /[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]/gi

    if (!regex) return
    let count = 0
    dataList.value.forEach(item => {
        const matches = item.value.match(regex!)
        if (matches) {
            item.value = matches.join(' | ')
            count++
        } else if (item.value !== '') {
            item.value = ''
        }
    })
    dataList.value = dataList.value.filter(i => i.value !== '')
    ElMessage.success(`智能提取完成，截获 ${count} 行含特定类型数据的条目`)
}

/**
 * 高级功能：隐私安全脱敏打码
 */
const handleMask = (type: string | number | object) => {
    if (typeof type !== 'string') return
    let count = 0
    dataList.value.forEach(item => {
        let old = item.value
        if (type === 'phone') {
            item.value = item.value.replace(/(1[3-9]\d{2})\d{4}(\d{4})/g, '$1****$2')
        } else if (type === 'idcard') {
            item.value = item.value.replace(/([1-9]\d{5})\d{8}(\d{4}|\d{3}[Xx])/gi, '$1********$2')
        } else if (type === 'name') {
            const raw = item.value.trim()
            if (raw.length === 2) {
               item.value = raw[0] + '*'
            } else if (raw.length > 2) {
               item.value = raw[0] + '*'.repeat(raw.length - 2) + raw[raw.length - 1]
            }
        }
        if (old !== item.value) count++
    })
    ElMessage.success(`安全执行：已为 ${count} 行数据实施隐私脱敏过滤`)
}

/**
 * 高级功能：分隔符分拆单元格为多行
 */
const splitToRows = () => {
    if (!splitChar.value) return
    let newList: DataRow[] = []
    let splitCount = 0
    dataList.value.forEach(item => {
        let parts: string[] = []
        try {
           const re = new RegExp(splitChar.value, 'g')
           parts = item.value.split(re)
        } catch {
           parts = item.value.split(splitChar.value)
        }
        
        if (parts.length > 1) splitCount++
        parts.filter(p => p.trim()).forEach(p => {
             newList.push({ id: generateId(), value: p.trim(), isHighlighted: false, count: 0 })
        })
    })
    dataList.value = newList
    ElMessage.success(`高级分列执行：成功拆分 ${splitCount} 组，衍生得到 ${newList.length} 行数据`)
}

/**
 * 单行操作
 */
const removeRow = (index: number) => {
    dataList.value.splice(index, 1)
}

const clearAll = () => {
    ElMessageBox.confirm('确定要清空所有数据吗？', '系统警告', {
        confirmButtonText: '确定清空',
        cancelButtonText: '暂不',
        type: 'warning'
    }).then(() => {
        dataList.value = []
        inputText.value = ''
        ElMessage.success('工作区已全部清空')
    }).catch(() => {})
}

/**
 * 将结果正确复制到剪贴板，适配 Excel/CSV 的换行行为
 */
const copyAllData = async () => {
    if (dataList.value.length === 0) return
    const text = dataList.value.map(item => {
        let val = item.value
        // 如果包含换行符或双引号，必须按 Excel 规范用双引号包裹并对内部的双引号进行翻倍转义
        if (val.includes('\n') || val.includes('"')) {
            val = '"' + val.replace(/"/g, '""') + '"'
        }
        return val
    }).join('\n')
    
    try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制处理后的全部数据，可直接粘贴到 Excel')
    } catch(e) {
        ElMessage.error('复制失败，浏览器可能限制了剪贴板权限')
    }
}

/**
 * State Persistence
 */
const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dataList: dataList.value,
        preventDuplicates: preventDuplicates.value,
        regexPattern: regexPattern.value,
        findText: findText.value,
        replaceText: replaceText.value,
        prefixText: prefixText.value,
        suffixText: suffixText.value,
        splitChar: splitChar.value,
        splitMode: splitMode.value
    }))
}

onMounted(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.dataList) dataList.value = parsed.dataList
            if (parsed.preventDuplicates !== undefined) preventDuplicates.value = parsed.preventDuplicates
            if (parsed.regexPattern) regexPattern.value = parsed.regexPattern
            if (parsed.findText) findText.value = parsed.findText
            if (parsed.replaceText) replaceText.value = parsed.replaceText
            if (parsed.prefixText) prefixText.value = parsed.prefixText
            if (parsed.suffixText) suffixText.value = parsed.suffixText
            if (parsed.splitChar) splitChar.value = parsed.splitChar
            if (parsed.splitMode) splitMode.value = parsed.splitMode
        }
    } catch(e) {}
})

// Deep watch saving state
watch(dataList, saveState, { deep: true })
watch([preventDuplicates, splitMode], saveState)

</script>

<style scoped>
.custom-textarea :deep(.el-textarea__inner) {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 13px;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
}
.custom-textarea :deep(.el-textarea__inner:focus) {
    box-shadow: none;
}
</style>
