import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Layout } from "./components/Layout.js";
import { AlertsPage } from "./pages/Alerts.js";
import { BillingPage } from "./pages/Billing.js";
import { DashboardPage } from "./pages/Dashboard.js";
import { DishDetailPage } from "./pages/DishDetail.js";
import { DishesPage } from "./pages/Dishes.js";
import { InvoicesPage } from "./pages/Invoices.js";
import { LoginPage } from "./pages/Login.js";
import { OnboardingPage } from "./pages/Onboarding.js";
import { PilotToolsPage } from "./pages/PilotTools.js";
import { SettingsPage } from "./pages/Settings.js";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "dishes", element: <DishesPage /> },
      { path: "recipes", element: <PilotToolsPage /> },
      { path: "ingredients", element: <PilotToolsPage /> },
      { path: "dishes/:dishId", element: <DishDetailPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "pilot-tools", element: <PilotToolsPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
