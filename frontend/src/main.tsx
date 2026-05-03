import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AuthProvider } from "./auth/AuthContext";
import { BlockedAccessGate } from "./components/BlockedAccessGate";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <BlockedAccessGate>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BlockedAccessGate>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
