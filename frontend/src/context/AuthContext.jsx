import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { deleteAccount, getMe, regenerateToken, logout } from "../api";
import wsService from "../services/wsService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [wsReady, setWsReady] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                setAuthLoading(true);
                const data = await getMe();
                setUser(data);
            } catch (error) {
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            wsService.disconnect();
            return;
        }

        wsService.connect();

        const offSync = wsService.on('sync_state', () => setWsReady(true));

        const timeout = setTimeout(() => {
            wsService.sync();
        }, 100);

        return () => {
            offSync();
            clearTimeout(timeout);
        };
    }, [user]);

    const doRegenerateToken = useCallback(async () => {
        if (!user)
            return null;

        return await regenerateToken();
    }, [user]);

    const doLogout = useCallback(async () => {
        await logout();
        setUser(null);
        setWsReady(false);
        wsService.disconnect();
    }, []);

    const doDeleteAccount = useCallback(async () => {
        if (!user)
            return;
        try {
            await deleteAccount();
            setUser(null);
            setWsReady(false);
            wsService.disconnect();
        } catch (error) {
            console.error('Failed to delete account', error);
        }
    }, [user]);

    const updateProStatus = useCallback(async () => {
        if (!user)
            return;

        try {
            const data = await getMe();
            setUser(data);

            return data;
        } catch (error) {
            console.error('Failed to refresh user data', error);
            return null;
        }
    }, [user]);

    const value = {
        user,
        setUser,
        authLoading,
        wsReady,
        isAuthed: !!user,
        doRegenerateToken,
        doLogout,
        doDeleteAccount,
        updateProStatus,
    };

    return <AuthContext.Provider value={ value }>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
