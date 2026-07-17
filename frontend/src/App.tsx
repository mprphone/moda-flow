import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Toasts } from './components/Toasts'
import { CreateDevelopmentModal } from './components/CreateDevelopmentModal'
import { BoardPage } from './pages/BoardPage'
import { TodayPage } from './pages/TodayPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { PartnersPage } from './pages/PartnersPage'
import { ProductionPage } from './pages/ProductionPage'
import { TeamPage } from './pages/TeamPage'
import { LoginPage } from './pages/LoginPage'
import { AuthProvider, useAuth } from './auth'

function Shell() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('today')
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) return <div className="loading">A iniciar sessão...</div>
  if (!user) return <LoginPage/>

  return <div className="app-shell">
    <Sidebar active={page} onChange={setPage}/>
    <div className="main-shell">
      <Topbar onCreate={() => setCreating(true)}/>
      <main>
        {page === 'today' && <TodayPage/>}
        {page === 'board' && <BoardPage refreshKey={refreshKey}/>}
        {page === 'shopping' && <ShoppingPage/>}
        {page === 'partners' && <PartnersPage/>}
        {page === 'production' && <ProductionPage/>}
        {page === 'team' && <TeamPage/>}
      </main>
    </div>
    {creating && <CreateDevelopmentModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setPage('board'); setRefreshKey(v => v + 1) }}/>}
  </div>
}

export default function App() {
  return <AuthProvider><Shell/><Toasts/></AuthProvider>
}
