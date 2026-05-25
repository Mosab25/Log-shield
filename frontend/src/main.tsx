import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AuthProvider } from "./auth/AuthContext";
import { BlockedAccessGate } from "./components/BlockedAccessGate";
import { queryClient } from "./queryClient";
import { startKeepAlive } from "./lib/keepAlive";
import "./index.css";

startKeepAlive();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <BlockedAccessGate>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </AuthProvider>
        </BlockedAccessGate>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
