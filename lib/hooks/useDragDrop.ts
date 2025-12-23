import { useState, useCallback } from 'react'

export interface DragItem {
  id: string
  type: string
  data?: any
}

export interface DropResult {
  success: boolean
  item?: DragItem
  target?: string
}

export function useDragDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem(item)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverTarget(null)
  }, [])

  const handleDragOver = useCallback((targetId: string) => {
    setDragOverTarget(targetId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null)
  }, [])

  const handleDrop = useCallback(
    async (
      targetId: string,
      onDrop: (item: DragItem, targetId: string) => Promise<boolean> | boolean
    ): Promise<DropResult> => {
      if (!draggedItem) {
        return { success: false }
      }

      try {
        const result = await onDrop(draggedItem, targetId)
        if (result) {
          setDraggedItem(null)
          setDragOverTarget(null)
          return { success: true, item: draggedItem, target: targetId }
        }
        return { success: false, item: draggedItem }
      } catch (error) {
        console.error('Drop error:', error)
        return { success: false, item: draggedItem }
      }
    },
    [draggedItem]
  )

  return {
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}

