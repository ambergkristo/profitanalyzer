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
      { path: "dishes/:dishId", element: <DishDetailPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "pilot-tools", element: <PilotToolsPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
