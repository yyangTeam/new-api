import { useSystemConfigStore } from '@/stores/system-config-store'
import { useIsAdmin } from '@/hooks/use-admin'

export function useModelMappedVisible(): boolean {
  const mode = useSystemConfigStore(
    (s) => s.config.modelMappedDisplayMode ?? 0
  )
  const isAdmin = useIsAdmin()

  if (mode === 2) return true
  if (mode === 1 && isAdmin) return true
  return false
}
