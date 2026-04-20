import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authRegister, authLogin, authMe } from '../api.js'

const AuthContext = createContext(null)

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('asp_token') || null)
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)

    const isSubscribed = subscription?.status === 'active'

    const refreshSubscription = useCallback(async () => {
        if (!token) return
        try {
            const res = await authMe(token)
            setSubscription(res.subscription || null)
        } catch (e) {
            console.error(e)
        }
    }, [token])

    useEffect(() => {
        async function loadUser() {
            if (!token) {
                setLoading(false)
                return
            }
            try {
                // 5s timeout so a dead backend does not hang the loading screen
                const controller = new AbortController()
                const tid = setTimeout(() => controller.abort(), 5000)
                const res = await authMe(token)
                clearTimeout(tid)
                setUser(res.user)
                setSubscription(res.subscription || null)
            } catch (e) {
                // Distinguish network errors from auth failures
                const isNetworkError = e?.name === 'AbortError' || e?.status === 0 || !navigator.onLine
                if (isNetworkError) {
                    console.warn("Backend unreachable - keeping token, staying offline")
                    // Do not clear the token if the network is just down
                } else {
                    console.warn("Auth session invalid or expired - clearing token", e?.message)
                    setUser(null)
                    setToken(null)
                    setSubscription(null)
                    localStorage.removeItem('asp_token')
                }
            } finally {
                setLoading(false)
            }
        }
        loadUser()
    }, [token])

    const register = async (email, password) => {
        const res = await authRegister(email, password)
        setToken(res.token)
        setUser(res.user)
        setSubscription(res.subscription || null)
        localStorage.setItem('asp_token', res.token)
        return res
    }

    const login = async (email, password) => {
        const res = await authLogin(email, password)
        setToken(res.token)
        setUser(res.user)
        setSubscription(res.subscription || null)
        localStorage.setItem('asp_token', res.token)
        return res
    }

    const logout = () => {
        setToken(null)
        setUser(null)
        setSubscription(null)
        localStorage.removeItem('asp_token')
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            subscription: subscription || { status: 'active', plan: 'Pro (Unlocked)' },
            loading,
            isSubscribed: true,
            register,
            login,
            logout,
            refreshSubscription,
        }}>
            {children}
        </AuthContext.Provider>
    )
}
