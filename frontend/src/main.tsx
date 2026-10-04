import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { toApiError } from "./api/errors";
import { AuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./components/toast/ToastProvider";
import { router } from "./router";
import "./styles/tokens.css";
import "./styles/global.css";
import { ThemeProvider } from "./theme/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only problems that might fix themselves (offline / server hiccup), never 4xx.
      retry: (failureCount, error) => {
        const apiError = toApiError(error);
        return (apiError.isNetworkError || apiError.isServerError) && failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
