"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { NotificationProvider } from "@/context/NotificationContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </Provider>
  );
}
