import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { useAuth } from "./AuthContext";

type AuthAction = () => void | Promise<void>;

export function useAuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const returnTo = `${location.pathname}${location.search}`;

  const requireAuth = useCallback((action: AuthAction): boolean => {
    if (isLoading) return false;
    if (!isAuthenticated) {
      setIsModalOpen(true);
      return false;
    }

    void action();
    return true;
  }, [isAuthenticated, isLoading]);

  const loginRequiredModal = (
    <LoginRequiredModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      returnTo={returnTo}
    />
  );

  return {
    requireAuth,
    loginRequiredModal,
    isAuthenticated,
    isAuthLoading: isLoading,
  };
}
