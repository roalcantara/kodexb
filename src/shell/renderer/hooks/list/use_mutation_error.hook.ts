import { useCallback, useState } from 'react'

export function useMutationError() {
  const [mutationError, setMutationError] = useState<string | null>(null)
  const clearMutationError = useCallback(() => setMutationError(null), [])
  return { mutationError, setMutationError, clearMutationError }
}

export type MutationErrorApi = ReturnType<typeof useMutationError>
