import { NavLink } from "react-router-dom";
import logo from '../../assets/AttunedLogo512.png'
import { useApp } from "../../context/AppContext";
import "./Header.css";

export default function Header() {
    const { isPro, setIsPro } = useApp();

    return (
        <header className="header">
            <div className="header__inner">
                <NavLink to="/" className="header__logo">
                    <img src={logo} alt="Attuned" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    <span className="header__brand">ATTUNED</span>
                </NavLink>

                <nav className="header__nav">
                    <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
                        Коллекции
                    </NavLink>
                    <NavLink to="/recommendations" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
                        Рекомендации
                    </NavLink>
                </nav>

                <div className="header__actions">
                    {/* DEV TOGGLE — убрать в продакшене */}
                    <button className={`btn-pro ${isPro ? "btn-pro--active" : ""}`} onClick={() => setIsPro((v) => !v)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14l-5-4.87 6.91-1.01L12 1z" />
                        </svg>
                        {isPro ? "Pro ✓" : "Попробовать Pro"}
                    </button>
                    <div className="avatar">ДП</div>
                </div>
            </div>
        </header>
    );
}