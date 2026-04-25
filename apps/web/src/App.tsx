import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/Dashboard.js";
import { DishDetailPage } from "./pages/DishDetail.js";
import { DishesPage } from "./pages/Dishes.js";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "dishes", element: <DishesPage /> },
      { path: "dishes/:dishId", element: <DishDetailPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
