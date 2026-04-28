import {createContext, useCallback, useContext, useEffect, useState} from "react";
import {deleteAccount, getMe, regenerateToken} from "../api";
import wsService from "../services/wsService";

const AuthContext = createContext(null);

const TOKEN_KEY = 'attuned_token';

export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(!!localStorage.getItem(TOKEN_KEY));
    const [wsReady, setWsReady] = useState(false);

    const saveToken = useCallback((t) => {
        localStorage.setItem(TOKEN_KEY, t);
        setTokenState(t);
    }, []);

    const clearToken = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setTokenState(null);
        setUser(null);
    }, []);

    useEffect(() => {
        if (!token) {
            setAuthLoading(false);
            return;
        }

        setAuthLoading(true);
        getMe(token)
            .then((data) => {
                setUser(data);
                setAuthLoading(false);
            })
            .catch(() => {
                clearToken();
                setAuthLoading(false);
            });
    }, [token, clearToken]);

    useEffect(() => {
        if (!token) {
            wsService.disconnect();
            return;
        }

        wsService.connect(token);

        const offSync = wsService.on('sync_state', () => setWsReady(true));

        const timeout = setTimeout(() => {
            wsService.sync();
        }, 100);

        return () => {
            offSync();
            clearTimeout(timeout);
        };
    }, [token]);

    const doRegenerateToken = useCallback(async () => {
        if (!token)
            return null;

        const data = await regenerateToken(token);

        return data.access_token;
    }, [token]);

    const updateToken = useCallback((newToken) => {
        saveToken(newToken);
    }, [saveToken]);

    const doDeleteAccount = useCallback(async () => {
        if (!token) return;
        await deleteAccount(token);
        wsService.disconnect();
        clearToken();
    }, [token, clearToken]);

    const value = {
        token,
        user,
        authLoading,
        wsReady,
        isAuthed: !!token && !!user,
        saveToken,
        clearToken,
        doRegenerateToken,
        updateToken,
        doDeleteAccount,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
