import api from "./client";

export async function generateAccount() {
    const { data } = await api.post('/auth/generate-account', {}, {
        withCredentials: true
    });

    return data;
}

export async function regenerateToken() {
    const { data } = await api.post('/auth/regenerate-token', {}, {
        withCredentials: true
    });

    return data;
}

export async function getMe() {
    const { data } = await api.get('/auth/me', {
        withCredentials: true
    });

    return data;
}

export async function logout() {
    const { data } = await api.post('/auth/logout', {}, {
        withCredentials: true
    });

    return data;
}

export async function deleteAccount() {
    const { data } = await api.get('/auth/delete-account', {
        withCredentials: true
    });

    return data;
}

export async function loginByToken(token) {
    const { data } = await api.post('/auth/set-token', { token }, {
        withCredentials: true
    });

    return data;
}
