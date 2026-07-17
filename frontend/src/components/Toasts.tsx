import { useEffect, useState } from 'react'
import { onToast, type Toast } from '../lib/toast'

export function Toasts() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => onToast(item => {
    setItems(current => [...current, item])
    setTimeout(() => setItems(current => current.filter(t => t.id !== item.id)), 4500)
  }), [])
  return <div className="toast-stack">
    {items.map(item => <div key={item.id} className={`toast toast-${item.kind}`}>{item.message}</div>)}
  </div>
}
