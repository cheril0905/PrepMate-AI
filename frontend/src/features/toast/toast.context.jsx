import { createContext, useContext, useState, useCallback } from "react"

const ToastContext = createContext()

let toastId = 0

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = "info", duration = 3000) => {
        const id = ++toastId
        setToasts(prev => [...prev, { id, message, type, removing: false }])

        setTimeout(() => {
            setToasts(prev =>
                prev.map(t => t.id === id ? { ...t, removing: true } : t)
            )
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id))
            }, 400)
        }, duration)
    }, [])

    const toast = {
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        warning: (msg) => addToast(msg, "warning"),
        info: (msg) => addToast(msg, "info"),
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type} ${t.removing ? 'toast--exit' : ''}`}>
                        <span className="toast__icon">
                            {t.type === 'success' && '✓'}
                            {t.type === 'error' && '✕'}
                            {t.type === 'warning' && '⚠'}
                            {t.type === 'info' && 'ℹ'}
                        </span>
                        <span className="toast__message">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
