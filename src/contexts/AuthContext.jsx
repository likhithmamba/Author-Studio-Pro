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
    const [token, setToken] = useState(() => localStorage.getItem('asp_auth_token') || null)
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)

    // Persist token
    useEffect(() => {
        if (token) {
            localStorage.setItem('asp_auth_token', token)
        } else {
            localStorage.removeItem('asp_auth_token')
        }
    }, [token])

    // On mount, check if we have a valid token
    useEffect(() => {
        if (!token) {
            setLoading(false)
            return
        }
        authMe(token)
            .then(data => {
                setUser(data.user)
                setSubscription(data.subscription)
            })
            .catch(() => {
                // Token invalid or expired
                setToken(null)
                setUser(null)
                setSubscription(null)
            })
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const register = useCallback(async (email, password) => {
        const data = await authRegister(email, password)
        setToken(data.token)
        setUser(data.user)
        setSubscription({ plan: 'free', status: 'none' })
        return data
    }, [])

    const login = useCallback(async (email, password) => {
        const data = await authLogin(email, password)
        setToken(data.token)
        setUser(data.user)
        setSubscription(data.subscription)
        return data
    }, [])

    const logout = useCallback(() => {
        setToken(null)
        setUser(null)
        setSubscription(null)
    }, [])

    const refreshSubscription = useCallback(async () => {
        if (!token) return
        try {
            const data = await authMe(token)
            setSubscription(data.subscription)
        } catch { /* ignore */ }
    }, [token])

    const isSubscribed = subscription?.status === 'active' && subscription?.plan !== 'free'

    return (
        <AuthContext.Provider value={{
            user,
            token,
            subscription,
            loading,
            isSubscribed,
            register,
            login,
            logout,
            refreshSubscription,
        }}>
            {children}
        </AuthContext.Provider>
    )
}
