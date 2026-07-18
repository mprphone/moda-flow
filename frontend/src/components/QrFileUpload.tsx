import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { FileUp, QrCode } from 'lucide-react'
import { api } from '../api/client'

export type UploadedFile = { url: string; mime_type: string; name: string }
type Session = { token: string; expires_at: string }
type Status = { status: string; file_url?: string; mime_type?: string; name?: string }

export function QrFileUpload({ onReceived }: { onReceived: (file: UploadedFile) => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [qr, setQr] = useState('')

  async function start() {
    const created = await api.post<Session>('/qr-uploads', {})
    const url = `${window.location.origin}${window.location.pathname}?qr_upload=${encodeURIComponent(created.token)}`
    setQr(await QRCode.toDataURL(url, { width: 240, margin: 1 })); setSession(created)
  }

  useEffect(() => {
    if (!session) return
    const timer = window.setInterval(async () => {
      const status = await api.get<Status>(`/qr-uploads/${session.token}`)
      if (status.status === 'received' && status.file_url) {
        window.clearInterval(timer)
        onReceived({ url: status.file_url, mime_type: status.mime_type || '', name: status.name || 'anexo' })
        setSession(null); setQr('')
      }
    }, 1800)
    return () => window.clearInterval(timer)
  }, [session?.token])

  return <div className="qr-upload">
    {!session && <button type="button" className="secondary-button" onClick={() => void start()}><QrCode size={16}/>Carregar pelo telemóvel</button>}
    {session && <div className="qr-panel"><img src={qr} alt="QR code para carregar anexo"/><div><strong>Ler com a câmara do telemóvel</strong><p>Escolha uma fotografia ou PDF. Esta janela atualiza automaticamente.</p><span><FileUp size={15}/>À espera do ficheiro…</span></div></div>}
  </div>
}
