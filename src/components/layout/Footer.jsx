import logo from "../../assets/AttunedLogo512.png";
import "./Footer.css";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer__inner">
                <div className="footer__logo">
                    <img src={logo} alt="Attuned" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    <span>ATTUNED</span>
                </div>
                <p className="footer__copy">©2026 @putka_sok · v0.1.0</p>
                <p className="footer__legal">Все права защищены.</p>
            </div>
        </footer>
    );
}