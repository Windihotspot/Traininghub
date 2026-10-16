import { ref } from 'vue'
import { normalizeError, type NormalizedError } from '@/utils/apiError'

export function useAsyncAction() {
  const loading = ref(false)
  const error = ref<NormalizedError | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try { return await fn() }
    catch (e) { error.value = normalizeError(e); return undefined }
    finally { loading.value = false }
  }
  return { loading, error, run }
}
