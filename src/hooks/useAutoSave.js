import { useRef, useCallback } from 'react'

/**
 * Auto-save hook with debouncing
 * @param {Function} saveFunction - Function to call for saving
 * @param {number} delay - Delay in milliseconds before auto-save (default: 2000)
 */
function useAutoSave(saveFunction, delay = 2000) {
  const timeoutRef = useRef(null)

  const triggerSave = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveFunction()
    }, delay)
  }, [saveFunction, delay])

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const saveImmediately = useCallback(() => {
    // Cancel any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Save immediately
    saveFunction()
  }, [saveFunction])

  return { triggerSave, cancelSave, saveImmediately }
}

export default useAutoSave
