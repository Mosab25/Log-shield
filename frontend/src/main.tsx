import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { BlockedAccessGate } from "./components/BlockedAccessGate";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <BlockedAccessGate>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BlockedAccessGate>
    </BrowserRouter>
  </React.StrictMode>
);
