import api from "./client";

export async function activatePromoCode(promoCode) {
    const { data } = await api.post('/promo/activate', {
        promo_code: promoCode,
        }, {
        withCredentials: true
    });

    return data;
}
