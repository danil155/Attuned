import api from "./client";

export async function generateAccount() {
    const { data } = await api.post('/auth/generate-account');

    return data;
}

export async function regenerateToken(token) {
    const { data } = await api.post('/auth/regenerate-token', {}, {
        headers: { 'x-token': token },
    });

    return data;
}

export async function getMe(token) {
    const { data } = await api.get('/auth/me', {
        headers: { 'x-token': token },
    });

    return data;
}

export async function deleteAccount(token) {
    const { data } = await api.get('/auth/delete-account', {
        headers: { 'x-token': token },
    });

    return data;
}
