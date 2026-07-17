export type Toast = { id: number; kind: 'error' | 'success' | 'info'; message: string }

type Listener = (toast: Toast) => void
const listeners = new Set<Listener>()
let nextId = 1

export function onToast(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function toast(kind: Toast['kind'], message: string) {
  const item: Toast = { id: nextId++, kind, message }
  listeners.forEach(listener => listener(item))
}
