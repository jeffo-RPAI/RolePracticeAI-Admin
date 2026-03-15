import React, { useState, useEffect } from 'react'
import { useAuth, useUser, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Shield, LogOut, Sun, Moon } from 'lucide-react'
import SiteAdminConsole from './SiteAdminConsole'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://api.rolepractice.ai'
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'jeffo@rolepractice.ai'

function AdminGate() {
  const { getToken, signOut } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('admin_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!userLoaded) return

    const email = user?.primaryEmailAddress?.emailAddress
    if (!email) {
      setError('No email found on account')
      setChecking(false)
      return
    }

    // Client-side email check first
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError('Access denied. This console is restricted to authorized administrators.')
      setChecking(false)
      return
    }

    // Server-side verification — confirm user has admin role in DB
    async function verifyAdmin() {
      try {
        const token = await getToken()
        const res = await fetch(`${BACKEND_URL}/api/user/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          setError('Failed to verify admin status. Backend returned ' + res.status)
          setChecking(false)
          return
        }
        const data = await res.json()
        if (data.role === 'admin' || data.is_site_admin) {
          setAuthorized(true)
        } else {
          setError('Access denied. Your account does not have site admin privileges.')
        }
      } catch (err) {
        setError('Failed to connect to backend: ' + err.message)
      }
      setChecking(false)
    }

    verifyAdmin()
  }, [userLoaded, user, getToken])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400 text-sm">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Admin Header */}
      <header className={`border-b ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-sm">RolePractice.ai Admin</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
              Site Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => signOut()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <SiteAdminConsole theme={theme} />
    </div>
  )
}

export default function App() {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <Shield className="w-10 h-10 text-blue-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-white">RolePractice.ai Admin</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to access the admin console</p>
            </div>
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'mx-auto',
                  card: 'bg-slate-900 border border-slate-700 shadow-2xl',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-slate-400',
                  formFieldLabel: 'text-slate-300',
                  formFieldInput: 'bg-slate-800 text-white border-slate-600',
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  socialButtonsBlockButton: 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700',
                  socialButtonsBlockButtonText: 'text-slate-200',
                  dividerLine: 'bg-slate-700',
                  dividerText: 'text-slate-500',
                  footerActionText: 'text-slate-400',
                  footerActionLink: 'text-blue-400 hover:text-blue-300',
                  footer: 'bg-slate-900 border-t border-slate-700',
                  identityPreview: 'bg-slate-800 border-slate-600',
                  identityPreviewText: 'text-slate-300',
                  identityPreviewEditButton: 'text-blue-400',
                  formFieldInputShowPasswordButton: 'text-slate-400',
                  otpCodeFieldInput: 'bg-slate-800 text-white border-slate-600',
                  alternativeMethodsBlockButton: 'text-slate-300 border-slate-600',
                  formResendCodeLink: 'text-blue-400',
                }
              }}
            />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <AdminGate />
      </SignedIn>
    </>
  )
}
