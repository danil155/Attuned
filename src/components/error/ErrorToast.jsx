import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { StyleEmoji } from "../../services/StyleEmoji";
import './ErrorToast.css';

const contentVariants = {
    hidden: {
        opacity: 0,
        y: 8,
        scale: 0.97,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 220,
            damping: 28,
        }
    },
    exit: {
        opacity: 0,
        y: 8,
        scale: 0.97,
        transition: { duration: 0.15 }
    }
};

export function ErrorToast({ message, onClose, duration = 5000 }) {
    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    return (
        <AnimatePresence>
            {message && (
                <div className="error-toast-notification">
                    <motion.div
                        className="error-toast-backdrop"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="error-toast-content">
                            <motion.span
                                className="error-toast-icon"
                                animate={{
                                    rotate: [0, -5, 5, -3, 3, 0],
                                    scale: [1, 1.15, 1]
                                }}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.1
                                }}
                            >
                                <StyleEmoji
                                    emoji="❌"
                                    size="25px"
                                />
                            </motion.span>
                            <div className="error-toast-text">
                                <strong>Ой-ой...</strong>
                                <span>{message}</span>
                            </div>
                            <button
                                className="error-toast-close"
                                onClick={onClose}
                                aria-label="Закрыть"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
