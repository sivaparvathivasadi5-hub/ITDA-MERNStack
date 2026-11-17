import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("pulseroom-token")) {
      setReady(true);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch((error) => {
        localStorage.removeItem("pulseroom-token");
        setUser(null);
        setSessionError(error.response?.data?.error || "Your session expired. Please sign in again.");
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    sessionError,
    async login(credentials) {
      const { data } = await api.post("/auth/login", credentials);
      localStorage.setItem("pulseroom-token", data.token);
      setUser(data.user);
    },
    async register(details) {
      const { data } = await api.post("/auth/register", details);
      localStorage.setItem("pulseroom-token", data.token);
      setUser(data.user);
    },
    logout() {
      localStorage.removeItem("pulseroom-token");
      setUser(null);
    }
  }), [user, ready, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
