import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { BottomNav } from './components/BottomNav'
import { Topbar } from './components/Topbar'
import { Toasts } from './components/Toasts'
import { CreateDevelopmentModal } from './components/CreateDevelopmentModal'
import { BoardPage } from './pages/BoardPage'
import { TodayPage } from './pages/TodayPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { PartnersPage } from './pages/PartnersPage'
import { ProductionPage } from './pages/ProductionPage'
import { TeamPage } from './pages/TeamPage'
import { FabricsPage } from './pages/FabricsPage'
import { LoginPage } from './pages/LoginPage'
import { ReconciliationPage } from './pages/ReconciliationPage'
import { ReportsPage } from './pages/ReportsPage'
import { AuthProvider, useAuth } from './auth'
import { MobileQrUploadPage } from './pages/MobileQrUploadPage'

function Shell() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('today')
  const [creating, setCreating] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) return <div className="loading">A iniciar sessão...</div>
  if (!user) return <LoginPage/>

  return <div className="app-shell">
    <Sidebar active={page} onChange={setPage} mobileOpen={navOpen} onClose={() => setNavOpen(false)}/>
    <div className="main-shell">
      <Topbar onCreate={() => setCreating(true)}/>
      <main>
        {page === 'today' && <TodayPage/>}
        {page === 'board' && <BoardPage board="portfolio" refreshKey={refreshKey}/>}
        {page === 'samples' && <BoardPage board="samples" refreshKey={refreshKey}/>}
        {page === 'fabrics' && <FabricsPage/>}
        {page === 'shopping' && <ShoppingPage/>}
        {page === 'partners' && <PartnersPage/>}
        {page === 'production' && <ProductionPage/>}
        {page === 'reconciliation' && <ReconciliationPage/>}
        {page === 'reports' && <ReportsPage/>}
        {page === 'team' && <TeamPage/>}
      </main>
      <BottomNav active={page} onChange={p => { setPage(p); setNavOpen(false) }} onMore={() => setNavOpen(true)}/>
    </div>
    {creating && <CreateDevelopmentModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setPage('board'); setRefreshKey(v => v + 1) }}/>}
  </div>
}

export default function App() {
  const qrToken = new URLSearchParams(window.location.search).get('qr_upload')
  if (qrToken) return <MobileQrUploadPage token={qrToken}/>
  return <AuthProvider><Shell/><Toasts/></AuthProvider>
}
