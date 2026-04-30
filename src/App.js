import {useState} from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider, GenresProvider } from "./context/AppContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import WelcomeModal from "./components/auth/WelcomeModal";
import Home from "./pages/Home/Home";
import Collections from "./pages/Collections/Collections";
import Recommendations from "./pages/Recommendations/Recommendations";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Feedback from "./pages/Feedback/Feedback";
import NotFound from "./pages/NotFound/NotFound";
import LegalConsentModal from "./components/legal/LegalConsentModal";
import "./App.css";

function LegalRoutes() {
    const location = useLocation();

    return (
        <div className="app">
            <div className="grain" />
            <Header />
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route
                        path="/privacy"
                        element={
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <Privacy />
                            </motion.div>
                        }
                    />
                    <Route
                        path="/terms"
                        element={
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <Terms />
                            </motion.div>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <NotFound />
                            </motion.div>
                        }
                    />
                </Routes>
            </AnimatePresence>
            <Footer />
        </div>
    );
}

function ProtectedRoutes() {
    const location = useLocation();

    return (
        <AppProvider>
            <GenresProvider>
                <div className="app">
                    <div className="grain" />
                    <Header />

                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route
                                path="/"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.05 }}
                                    >
                                        <Home />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="/collections"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <Collections />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="/recommendations"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <Recommendations />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="/privacy"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <Privacy />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="/terms"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <Terms />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="/feedback"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <Feedback />
                                    </motion.div>
                                }
                            />
                            <Route
                                path="*"
                                element={
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                    >
                                        <NotFound />
                                    </motion.div>
                                }
                            />
                        </Routes>
                    </AnimatePresence>

                    <Footer />
                </div>
            </GenresProvider>
        </AppProvider>
    );
}

function AppShell() {
  const { isAuthed, authLoading } = useAuth();
  const location = useLocation();

  const [legalAccepted, setLegalAccepted] = useState(
      () => localStorage.getItem('attuned_legal_accepted') === 'true'
  );

  if (authLoading) {
    return (
        <div className="app-loading">
          <div className="app-loading__spinner" />
        </div>
    );
  }

  if (!isAuthed) {
    return <WelcomeModal />
  }

  if (!legalAccepted) {
      if (location.pathname === '/privacy' || location.pathname === '/terms') {
          return <LegalRoutes />;
      }

      return (
          <>
              <LegalConsentModal onAccept={() => setLegalAccepted(true)} />
              <LegalRoutes />
          </>
      );
  }

  return <ProtectedRoutes />;
}

export default function App() {
  return (
      <AuthProvider>
          <BrowserRouter>
              <AppShell />
          </BrowserRouter>
      </AuthProvider>
  );
}
