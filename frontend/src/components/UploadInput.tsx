import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { api } from '../api/client'

type Props = { value: string; onChange: (url: string) => void; label?: string }

export function UploadInput({ value, onChange, label = 'Fotografia' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const { url } = await api.upload(file)
      onChange(url)
    } finally {
      setBusy(false)
    }
  }

  return <div className="upload-input">
    <span className="upload-label">{label}</span>
    <div className="upload-row">
      {value ? <div className="upload-preview">
        <img src={value} alt=""/>
        <button type="button" onClick={() => onChange('')} title="Remover"><X size={13}/></button>
      </div> : null}
      <button type="button" className="upload-button" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Camera size={15}/>{busy ? 'A enviar...' : value ? 'Trocar foto' : 'Adicionar foto'}
      </button>
    </div>
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      style={{ display: 'none' }}
      onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = '' }}
    />
  </div>
}
