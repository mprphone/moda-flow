import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../auth'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error && err.message !== 'network' ? err.message : 'Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-shell">
    <form className="login-card" onSubmit={submit}>
      <div className="brand"><Sparkles size={26}/><div><strong>Moda Flow</strong><small>atelier inteligente</small></div></div>
      <h1>Iniciar sessão</h1>
      <p>Use as suas credenciais de equipa.</p>
      <label>Email<input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Palavra-passe<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label>
      {error && <div className="login-error">{error}</div>}
      <button className="primary-button" disabled={busy} type="submit">{busy ? 'A entrar...' : 'Entrar'}</button>
    </form>
  </div>
}
