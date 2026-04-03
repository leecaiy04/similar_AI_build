<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Action Header Toolbar -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 shrink-0 shadow-sm z-10 text-sm">
      <!-- Row 1: Duplicate Management -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-bold text-gray-500 w-16 text-right">閲嶅澶勭悊</span>
        <el-button-group>
          <el-button size="small" type="primary" plain @click="highlightDuplicates">楂樹寒閲嶅 (S)</el-button>
          <el-button size="small" type="info" plain @click="clearHighlights">娓呴珮浜?(C)</el-button>
          <el-button size="small" type="success" plain @click="countDuplicates">缁熻娆℃暟 (N)</el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" :type="preventDuplicates ? 'warning' : 'default'" @click="togglePreventDuplicates">
            {{ preventDuplicates ? 'Enabled' : 'Prevent Duplicates' }}
          </el-button>
          <el-button size="small" type="default" @click="clearPreventDuplicates" :disabled="!preventDuplicates">
            娓呮嫤鎴?(R)
          </el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" type="danger" plain @click="removeDuplicates">鍒犻櫎閲嶅 (D)</el-button>
          <el-button size="small" type="warning" plain @click="extractNumbers">Extract numbers</el-button>
        </el-button-group>
        
        <div class="flex-1"></div>
        <el-button size="small" type="danger" text @click="clearAll" icon="Delete">Clear all</el-button>
      </div>

      <!-- Row 2: Text Transformation -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-bold text-gray-500 w-16 text-right">鍩虹澶勭悊</span>
        <el-button-group>
          <el-button size="small" @click="trimSpaces">鍘婚灏剧┖</el-button>
          <el-button size="small" @click="removeEmpty">Remove empty</el-button>
          <el-button size="small" @click="sortData('asc')">Sort asc</el-button>
          <el-button size="small" @click="sortData('desc')">Sort desc</el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" @click="convertCase('lower')">Lowercase</el-button>
          <el-button size="small" @click="convertCase('upper')">Uppercase</el-button>
        </el-button-group>

        <span class="text-xs font-bold text-gray-500 ml-4">姝ｅ垯鎿嶄綔</span>
        <div class="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1 py-1">
          <el-input v-model="regexPattern" size="small" placeholder="濡?\d{3,} 鎴?^A.*" class="w-40 !mx-0" clearable />
          <el-button size="small" type="primary" plain @click="applyRegex('match')">鎻愬彇鍖归厤</el-button>
          <el-button size="small" type="danger" plain @click="applyRegex('filter')">Filter rows</el-button>
          <el-button size="small" type="success" plain @click="applyRegex('keep')">Keep rows</el-button>
        </div>
      </div>

      <!-- Row 3: Premium Tools -->
      <div class="flex flex-wrap gap-2 items-center mt-2 border-t border-gray-100 dark:border-gray-800 pt-3">
        <span class="text-xs font-bold text-amber-500 w-16 text-right">楂樼骇鍔熻兘</span>
        
        <!-- Find & Replace -->
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
          <el-input v-model="findText" size="small" placeholder="鏌ユ壘鍐呭" class="w-24 !mx-0" clearable />
          <el-input v-model="replaceText" size="small" placeholder="Replace with" class="w-24 !mx-0" clearable />
          <el-button size="small" type="warning" plain @click="batchReplace" class="!border-amber-300">鎵归噺鏇挎崲</el-button>
        </div>

        <!-- Prefix / Suffix -->
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
          <el-input v-model="prefixText" size="small" placeholder="缁熶竴鍓嶇紑" class="w-24 !mx-0" clearable />
          <el-input v-model="suffixText" size="small" placeholder="缁熶竴鍚庣紑" class="w-24 !mx-0" clearable />
          <el-button size="small" type="warning" plain @click="addFixes" class="!border-amber-300">杩藉姞</el-button>
        </div>

        <!-- Masking & Spilt & Extract -->
        <el-button-group>
           <el-dropdown trigger="click" @command="handleExtract">
              <el-button size="small" type="warning" plain>Smart extract</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="phone">Phone numbers</el-dropdown-item>
                  <el-dropdown-item command="email">鉁夛笍 鎻愬彇閭</el-dropdown-item>
                  <el-dropdown-item command="url">URLs</el-dropdown-item>
                  <el-dropdown-item command="idcard">馃 鎻愬彇韬唤璇?18浣?</el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>
           <el-dropdown trigger="click" @command="handleMask">
              <el-button size="small" type="warning" plain>Mask data</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="phone">138****1234 phone</el-dropdown-item>
                  <el-dropdown-item command="idcard">110105******1234 ID</el-dropdown-item>
                  <el-dropdown-item command="name">鏉?鏄?(鍩轰簬琛岄鏂囨湰)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>
        </el-button-group>
        
        <div class="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-1">
           <el-input v-model="splitChar" size="small" placeholder="Delimiter" class="w-24 !mx-0" clearable />
           <el-button size="small" type="warning" plain @click="splitToRows" class="!border-amber-300">Split rows</el-button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Data Input / Editor -->
      <div class="flex-1 p-4 overflow-hidden flex flex-col">
        <div class="flex justify-between items-center mb-2 px-1">
          <label class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            鏁版嵁澶勭悊宸ヤ綔鍖?
            <el-tag size="small" type="info" round class="font-mono scale-90">{{ dataList.length }} rows</el-tag>
          </label>
          <el-button size="small" type="primary" plain @click="copyAllData" :disabled="dataList.length === 0">
             涓€閿鍒?(瀹岀編杩樺師鍥?Excel)
          </el-button>
        </div>

        <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div class="flex justify-between items-center mb-2">
               <span class="text-xs text-gray-500 font-bold tracking-widest uppercase">Add input</span>
               <el-radio-group v-model="splitMode" size="small">
                 <el-radio-button value="newline">鎸夎鍒嗛殧</el-radio-button>
                 <el-radio-button value="blankline">鎸夌┖琛屽垎闅?鏀寔澶氳鏁版嵁)</el-radio-button>
               </el-radio-group>
            </div>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="鍦ㄦ绮樿创澶氳鏂囨湰鏁版嵁锛屾垨鐩存帴杈撳叆鍚庣偣鍑绘坊鍔?.."
              resize="none"
              class="custom-textarea"
              @keydown.enter.prevent="addTypedData"
            />
            <div class="mt-2 flex justify-end">
              <el-button size="small" type="primary" @click="addTypedData">杩藉姞鏁版嵁鍒板垪琛?(Enter)</el-button>
            </div>
          </div>

          <!-- Virtual/Rendered List -->
          <div class="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
            <div v-if="dataList.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 select-none pb-12">
               <div class="text-5xl mb-4 text-gray-200 dark:text-gray-700">馃搵</div>
               <p class="text-sm font-medium">鏆傛棤鏁版嵁</p>
               <p class="text-xs mt-1">Paste content above and append it to the list.</p>
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
                    閲嶅 {{ item.count }} 娆?
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
import { useDataProcessingWorkspace } from '../features/data-processing/composables/useDataProcessingWorkspace'

const {
  addFixes,
  addTypedData,
  applyRegex,
  batchReplace,
  clearAll,
  clearHighlights,
  clearPreventDuplicates,
  convertCase,
  copyAllData,
  countDuplicates,
  dataList,
  extractNumbers,
  findText,
  highlightDuplicates,
  handleExtract,
  handleMask,
  inputText,
  prefixText,
  preventDuplicates,
  regexPattern,
  removeDuplicates,
  removeEmpty,
  removeRow,
  replaceText,
  sortData,
  splitChar,
  splitMode,
  splitToRows,
  suffixText,
  togglePreventDuplicates,
  trimSpaces,
} = useDataProcessingWorkspace()
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


