import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TokenRevealModal from "../auth/TokenRevealModal";
import ProSubscriptionModal from "../subsciption/ProSubscriptionModal";
import { StyleEmoji } from "../../services/StyleEmoji";
import logo from "../../assets/AttunedLogo512.png";
import "./Header.css";

export default function Header() {
    const { user, token, doRegenerateToken, updateToken, doDeleteAccount, clearToken, updateProStatus } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [showNewTokenModal, setShowNewTokenModal] = useState(false);
    const [newGeneratedToken, setNewGeneratedToken] = useState(null);
    const [showProModal, setShowProModal] = useState(false);

    const menuRef = useRef(null);
    const avatarRef = useRef(null);

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

    const handleRegenToken = async () => {
        setRegenLoading(true);
        try {
            const newToken = await doRegenerateToken();
            setNewGeneratedToken(newToken);
            setShowNewTokenModal(true);
            setMenuOpen(false);
        } catch (error) {
            console.error('Error during token generation:', error);
        } finally {
            setRegenLoading(false);
        }
    };

    const handleTokenModalClose = () => {
        if (newGeneratedToken) {
            updateToken(newGeneratedToken);
        }
        setShowNewTokenModal(false);
        setNewGeneratedToken(null);
    };

    const handleProUpgrade = () => {
        setMenuOpen(false);
        setShowProModal(true);
    };

    const handleProSuccess = async () => {
        await updateProStatus();
    }

    const handleLogout = () => {
        clearToken();
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

                    <nav className="header__nav">
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
                                            {user?.is_pro ? '✦ Pro подписка' : 'Free план'}
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

                                <div className="account-menu__section">
                                    <p className="account-menu__section-label">Токен доступа</p>
                                    <div className="token-row">
                                        <code className="token-row__value" title={token}>
                                            {maskToken(token)}
                                        </code>
                                    </div>
                                </div>

                                <div className="account-menu__divider" />

                                <div className="account-menu__actions">
                                    <button
                                        className="menu-action"
                                        onClick={handleRegenToken}
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
