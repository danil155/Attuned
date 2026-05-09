import { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth, useError } from "../../context";
import { StyleEmoji } from "../../services/StyleEmoji";
import TokenRevealModal from "../auth/TokenRevealModal";
import ProSubscriptionModal from "../subsciption/ProSubscriptionModal";
import logo from "../../assets/AttunedLogo512.png";
import "./Header.css";

export default function Header() {
    const { user, doRegenerateToken, doDeleteAccount, updateProStatus, doLogout } = useAuth();
    const { showError } = useError();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [showNewTokenModal, setShowNewTokenModal] = useState(false);
    const [newGeneratedToken, setNewGeneratedToken] = useState(null);
    const [showProModal, setShowProModal] = useState(false);

    const menuRef = useRef(null);
    const avatarRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const burgerBtnRef = useRef(null);

    useEffect(() => {
        if (!menuOpen)
            return;

        const handler = (e) => {
            if (!menuRef.current?.contains(e.target) && !avatarRef.current?.contains(e.target)) {
                setMenuOpen(false);
                setDeleteConfirm(false);
            }
        };

        document.addEventListener('mousedown', handler);

        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    useEffect(() => {
        if (!mobileMenuOpen)
            return;

        const handler = (e) => {
            if (!mobileMenuRef.current?.contains(e.target) && !burgerBtnRef.current?.contains(e.target)) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);

        return () => document.removeEventListener('mousedown', handler);
    }, [mobileMenuOpen]);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const handleRegenerate = async () => {
        setRegenLoading(true);
        try {
            const data = await doRegenerateToken();

            setNewGeneratedToken(data.access_token);
            setShowNewTokenModal(true);
        } catch (error) {
            console.error('Error during token generation:', error);

            if (error.response?.status === 429) {
                showError('Слишком много попыток. Попробуйте через час')
            } else {
                showError('Не удалось сгенерировать токен')
            }
        } finally {
            setRegenLoading(false);
            setMenuOpen(false);
        }
    };

    const handleTokenModalClose = async () => {
        setShowNewTokenModal(false);
        setNewGeneratedToken(null);

        await updateProStatus();
    }

    const handleProUpgrade = () => {
        setMenuOpen(false);
        setShowProModal(true);
    };

    const handleProSuccess = async () => {
        await updateProStatus();
    }

    const handleLogout = async () => {
        await doLogout();
        sessionStorage.clear();
        setMenuOpen(false);
    };

    const handleDelete = async () => {
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }

        await doDeleteAccount();
        sessionStorage.clear();
        setMenuOpen(false);
    };

    const maskToken = (token) => {
        if (!token)
            return '';
        if (token.length <= 16)
            return token;

        const start = token.slice(0, 8);
        const end = token.slice(-4);

        return `${start}...${end}`
    };

    return (
        <>
            <header className="header">
                <div className="header__inner">
                    <NavLink to="/" className="header__logo">
                        <img src={logo} width={34} height={34} alt="ATTUNED Logo" />
                        <span className="header__brand">ATTUNED</span>
                    </NavLink>

                    <nav className="header__nav header__nav--desktop">
                        <NavLink to="/collections" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
                            Коллекции
                        </NavLink>
                        <NavLink to="/recommendations" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
                            Рекомендации
                        </NavLink>
                        <NavLink to="/feedback" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
                            Обратная связь
                        </NavLink>
                    </nav>

                    <div className="header__actions">
                        {user?.is_pro && (
                            <span className="header__pro-badge">PRO</span>
                        )}

                        <button
                            ref={burgerBtnRef}
                            className={`burger-btn ${mobileMenuOpen ? "burger-btn--open" : ""}`}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Меню"
                        >
                            <span className="burger-btn__line"></span>
                            <span className="burger-btn__line"></span>
                            <span className="burger-btn__line"></span>
                        </button>

                        <button
                            ref={avatarRef}
                            className={`avatar-btn ${menuOpen ? "avatar-btn--open" : ""}`}
                            onClick={() => setMenuOpen((v) => !v)}
                            title="Аккаунт"
                        >
                            <StyleEmoji
                                emoji={user?.avatar_emoji}
                                className="avatar-emoji"
                                size="25px"
                            />
                        </button>

                        {menuOpen && (
                            <div ref={menuRef} className="account-menu">
                                <div className="account-menu__header">
                                    <StyleEmoji
                                        emoji={user?.avatar_emoji}
                                        className="account-menu__emoji"
                                        size="35px"
                                    />
                                    <div>
                                        <p className="account-menu__plan">
                                            {user?.is_pro ? 'Pro подписка' : 'Free план'}
                                        </p>
                                    </div>
                                </div>

                                <div className="account-menu__divider" />

                                {!user?.is_pro && (
                                    <>
                                        <button
                                            className="menu-action menu-action--pro"
                                            onClick={handleProUpgrade}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2L15 8.5L22 9.5L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.5L9 8.5L12 2Z"/>
                                            </svg>
                                            Оформить Pro-подписку
                                        </button>
                                        <div className="account-menu__divider" />
                                    </>
                                )}

                                <div className="account-menu__section">
                                    <p className="account-menu__section-label">Public ID</p>
                                    <div className="token-row">
                                        <code className="token-row__value">
                                            {user?.external_id ?? "—"}
                                        </code>
                                    </div>
                                </div>

                                <div className="account-menu__divider" />

                                <div className="account-menu__actions">
                                    <button
                                        className="menu-action"
                                        onClick={handleRegenerate}
                                        disabled={regenLoading}
                                    >
                                        {regenLoading
                                            ? <span className="btn-spinner-small" />
                                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
                                        }
                                        Сгенерировать новый токен
                                    </button>

                                    <button
                                        className="menu-action"
                                        onClick={handleLogout}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                                        </svg>
                                        Выйти из аккаунта
                                    </button>

                                    <div className="account-menu__divider" style={{ margin: '4px 0' }} />

                                    <Link
                                        to="/terms"
                                        target="_blank"
                                        className="menu-action"
                                        onClick={() => setMenuOpen(false)}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                        Пользовательское соглашение
                                    </Link>

                                    <Link
                                        to="/privacy"
                                        target="_blank"
                                        className="menu-action"
                                        onClick={() => setMenuOpen(false)}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                        </svg>
                                        Политика конфиденциальности
                                    </Link>

                                    <div className="account-menu__divider" style={{ margin: '4px 0' }} />

                                    <button
                                        className={`menu-action menu-action--danger ${deleteConfirm ? "menu-action--confirm" : ""}`}
                                        onClick={handleDelete}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                        </svg>
                                        {deleteConfirm ? "Подтвердить удаление?" : "Удалить аккаунт"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div ref={mobileMenuRef} className={`mobile-menu ${mobileMenuOpen ? "mobile-menu--open" : ""}`}>
                <nav className="mobile-menu__nav">
                    <NavLink
                        to="/collections"
                        className={({ isActive }) => `mobile-menu__link ${isActive ? "mobile-menu__link--active" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        Коллекции
                    </NavLink>
                    <NavLink
                        to="/recommendations"
                        className={({ isActive }) => `mobile-menu__link ${isActive ? "mobile-menu__link--active" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12h4l3-9 3 18 3-9h4"/>
                            <path d="M18 4v16"/>
                            <path d="M22 8v8"/>
                        </svg>
                        Рекомендации
                    </NavLink>
                    <NavLink
                        to="/feedback"
                        className={({ isActive }) => `mobile-menu__link ${isActive ? "mobile-menu__link--active" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                        Обратная связь
                    </NavLink>
                </nav>
            </div>

            <div className={`mobile-menu-overlay ${mobileMenuOpen ? "mobile-menu-overlay--open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

            {showNewTokenModal && newGeneratedToken && (
                <TokenRevealModal token={newGeneratedToken} onClose={handleTokenModalClose} />
            )}

            <ProSubscriptionModal
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
                onSuccess={handleProSuccess}
            />
        </>
    );
}
