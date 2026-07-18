import { useState } from 'react'
import { Camera, CheckCircle2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function MobileQrUploadPage({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    const body = new FormData(); body.append('file', file)
    try {
      const response = await fetch(`${API_URL}/public/qr-uploads/${encodeURIComponent(token)}`, { method: 'POST', body })
      if (!response.ok) { const data = await response.json(); throw new Error(data.detail || 'Falha no envio') }
      setDone(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha no envio') }
    finally { setBusy(false) }
  }

  return <main className="mobile-upload-page"><div className="mobile-upload-card">
    {done ? <><CheckCircle2 size={52}/><h1>Ficheiro enviado</h1><p>Já pode voltar ao computador. A fotografia ou PDF entrou automaticamente na ficha.</p></> : <><Camera size={44}/><h1>Anexar ao Shopping</h1><p>Tire uma fotografia ou escolha uma imagem/PDF do telemóvel.</p><label className="primary-button">{busy ? 'A enviar…' : 'Escolher fotografia ou PDF'}<input hidden type="file" accept="image/*,application/pdf" capture="environment" disabled={busy} onChange={e => void send(e.target.files?.[0])}/></label>{error && <p className="eta-risk">{error}</p>}</>}
  </div></main>
}
