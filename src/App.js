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
import "./App.css";

function AppShell() {
  const { isAuthed, authLoading } = useAuth();
  const location = useLocation();

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
                      </Routes>
                  </AnimatePresence>

                  <Footer />
              </div>
          </GenresProvider>
      </AppProvider>
  );
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
