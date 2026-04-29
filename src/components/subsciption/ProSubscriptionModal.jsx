import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { activatePromoCode } from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./ProSubscriptionModal.css";

export default function ProSubscriptionModal({ isOpen, onClose, onSuccess }) {
    const { token } = useAuth();

    const [promoCode, setPromoCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen && !loading && !success) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, loading, success, onClose]);

    useEffect(() => {
        if (showComingSoon) {
            const timer = setTimeout(() => {
                setShowComingSoon(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [showComingSoon]);

    const handlePromoSubmit = async (e) => {
        e.preventDefault();
        if (!promoCode.trim())
            return;

        setLoading(true);
        setError(null);

        try {
            const result = await activatePromoCode(token, promoCode.trim().toUpperCase());

            if (result.success) {
                setSuccess(true);

                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                    setSuccess(false);
                    setPromoCode('');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Неверный промокод");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentClick = () => {
        setShowComingSoon(true);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading && !success) {
            onClose();
        }
    };

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    }

    const modalVariants = {
        hidden: {
            opacity: 0,
            y: 40,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.3
            }
        },
        exit: {
            opacity: 0,
            y: 30,
            scale: 0.96,
            transition: {
                duration: 0.25,
                ease: 'easeOut'
            }
        }
    };

    const toastVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            x: '-50%',
            scale: 0.9
        },
        visible: {
            opacity: 1,
            y: 0,
            x: '-50%',
            scale: 1,
            transition: {
                type: 'spring',
                damping: 20,
                stiffness: 400,
                mass: 0.8
            }
        },
        exit: {
            opacity: 0,
            y: 50,
            x: '-50%',
            scale: 0.9,
            transition: {
                duration: 0.2,
                ease: 'easeIn'
            }
        }
    };

    return createPortal(
        <>
            <AnimatePresence mode='wait'>
                {isOpen && (
                    <motion.div
                        key="modal-overlay"
                        className="pro-modal-overlay"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.25 }}
                        onClick={handleOverlayClick}
                    >
                        <motion.div
                            key="modal-content"
                            className="pro-modal"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="modal-close"
                                onClick={onClose}
                                disabled={loading || success}
                            >
                                ×
                            </button>

                            <div className="pro-modal__icon">✨</div>
                            <h2 className="pro-modal__title">ATTUNED PRO</h2>

                            {!success ? (
                                <>
                                    <p className="pro-modal__subtitle">
                                        Расширь свои возможности с Pro-подпиской
                                    </p>

                                    <div className="pro-features">
                                        <div className="pro-feature">
                                            <span className="pro-feature__check">✓</span>
                                            <span>До <strong>5 коллекций</strong> вместо 1</span>
                                        </div>
                                        <div className="pro-feature">
                                            <span className="pro-feature__check">✓</span>
                                            <span>До <strong>50 игр в коллекции</strong> вместо 30</span>
                                        </div>
                                        <div className="pro-feature">
                                            <span className="pro-feature__check">✓</span>
                                            <span><strong>Приоритетная поддержка</strong></span>
                                        </div>
                                        <div className="pro-feature">
                                            <span className="pro-feature__check">✓</span>
                                            <span><strong>Уважение</strong> от окружающих</span>
                                        </div>
                                    </div>

                                    <div className="pro-payment-section">
                                        <button
                                            className="pro-payment-btn"
                                            onClick={handlePaymentClick}
                                            disabled={loading}
                                        >
                                            💳 Оформить подписку
                                        </button>

                                        <div className="pro-divider">
                                            <span>или</span>
                                        </div>

                                        <form onSubmit={handlePromoSubmit} className="promo-form">
                                            <input
                                                type="text"
                                                className="promo-input"
                                                placeholder="Введите промокод"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value)}
                                                disabled={loading}
                                            />
                                            <button
                                                type="submit"
                                                className="promo-submit"
                                                disabled={loading || !promoCode.trim()}
                                            >
                                                {loading ? "..." : "Активировать"}
                                            </button>
                                        </form>

                                        {error && (
                                            <motion.p
                                                className="pro-error"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {error}
                                            </motion.p>
                                        )}
                                    </div>

                                    <p className="pro-modal__note">
                                        Бесплатный пробный период 30 дней по промокоду <strong>ATTUNED</strong>
                                    </p>
                                </>
                            ) : (
                                <motion.div
                                    className="pro-success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        type: 'spring',
                                        damping: 15,
                                        stiffness: 400
                                    }}
                                >
                                    <motion.span
                                        className="pro-success__icon"
                                        initial={{ rotate: -180, scale: 0 }}
                                        animate={{ rotate: 0, scale: 1 }}
                                        transition={{ delay: 0.1, type: 'spring' }}
                                    >
                                        🎉
                                    </motion.span>
                                    <p className="pro-success__title">УРА!</p>
                                    <p className="pro-success__text">Pro-подписка активирована на 30 дней</p>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showComingSoon && (
                    <motion.div
                        key="toast"
                        className="toast-notification"
                        variants={toastVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="toast-content">
                            <motion.span
                                className="toast-icon"
                                animate={{
                                    rotate: [0, 10, -10, 5, -5, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.1
                                }}
                            >
                                💳
                            </motion.span>
                            <div className="toast-text">
                                <strong>Возможность оплаты скоро появится!</strong>
                                <span>Следите за обновлениями</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>,
        document.body
    );
}
