import api from "./client";

export async function activatePromoCode(token, promoCode) {
    const { data } = await api.post('/promo/activate',
        { promo_code: promoCode },
        { headers: { 'x-token': token },
    });

    return data;
}
