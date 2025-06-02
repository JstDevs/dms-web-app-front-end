import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CustomChakaraProvider } from "./components/ui/CustomChakraProvider.tsx";
import { Provider } from "react-redux";
import { store } from "@/redux/store.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <CustomChakaraProvider>
        <App />
      </CustomChakaraProvider>
    </Provider>
  </StrictMode>
);
