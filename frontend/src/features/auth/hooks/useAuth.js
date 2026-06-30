import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";
import { useToast } from "../../toast/toast.context";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context
    const toast = useToast()


    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            toast.success("Login successful! Welcome back.")
            return true
        } catch (err) {
            const msg = err.response?.data?.msg || "Login failed. Please check your credentials."
            toast.error(msg)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            toast.success("Registration successful! Welcome aboard.")
            return true
        } catch (err) {
            const msg = err.response?.data?.msg || "Registration failed. Please try again."
            toast.error(msg)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            setUser(null)
            toast.info("You've been logged out.")
        } catch (err) {
            toast.error("Logout failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {

        const getAndSetUser = async () => {
            try {
                const data = await getMe()
                if (data && data.user) {
                    setUser(data.user)
                }
            } catch (err) {
                // Silent fail - user is not logged in
            } finally {
                setLoading(false)
            }
        }

        getAndSetUser()

    }, [])

    return { user, loading, handleRegister, handleLogin, handleLogout }
}