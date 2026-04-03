import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import Recommendations from "./pages/Recommendations/Recommendations";
import "./App.css";

export default function App() {
  return (
      <AppProvider>
        <BrowserRouter>
          <div className="app">
            <div className="grain" />
            <Header />
            <Routes>
              <Route path="/"                index element={<Home />} />
              <Route path="/profile"         element={<Profile />} />
              <Route path="/recommendations" element={<Recommendations />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
      </AppProvider>
  );
}