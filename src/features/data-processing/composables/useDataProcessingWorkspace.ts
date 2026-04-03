import { ref, watch } from 'vue'
import { createTransformService, type DataRow, type RegexAction } from '../service/transformService'

const STORAGE_KEY = 'premium_data_proc_v1'

export function useDataProcessingWorkspace() {
  const service = createTransformService()
  const dataList = ref<DataRow[]>([])
  const inputText = ref('')
  const regexPattern = ref('')
  const splitMode = ref<'newline' | 'blankline'>('newline')
  const preventDuplicates = ref(false)

  const addTypedData = () => {
    const result = service.addRows({
      existing: dataList.value,
      inputText: inputText.value,
      splitMode: splitMode.value,
      preventDuplicates: preventDuplicates.value,
    })
    dataList.value = result.rows
    inputText.value = ''
    saveState()
    return result
  }

  const applyRegex = (action: RegexAction) => {
    dataList.value = service.applyRegex(dataList.value, regexPattern.value, action)
    saveState()
  }

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dataList: dataList.value,
        regexPattern: regexPattern.value,
        splitMode: splitMode.value,
        preventDuplicates: preventDuplicates.value,
      }),
    )
  }

  watch([dataList, regexPattern, splitMode, preventDuplicates], saveState, { deep: true })

  return {
    addTypedData,
    applyRegex,
    dataList,
    inputText,
    preventDuplicates,
    regexPattern,
    splitMode,
  }
}
