import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CustomChakaraProvider } from "./components/ui/CustomChakraProvider.tsx";
import { Provider } from "react-redux";
import { store } from "@/redux/store.ts";

// Suppress Tesseract LSTM errors globally (they're non-fatal warnings)
// This must run before any Tesseract code loads
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args: any[]) => {
  const message = String(args[0] || '');
  // Suppress LSTM-related errors from Tesseract.js WASM
  if (message.includes('LSTM requested, but not present') || 
      (message.includes('LSTM') && message.includes('tesseract'))) {
    return; // Don't log this error
  }
  originalError.apply(console, args);
};
console.warn = (...args: any[]) => {
  const message = String(args[0] || '');
  // Suppress LSTM-related warnings
  if (message.includes('LSTM requested, but not present') || 
      (message.includes('LSTM') && message.includes('tesseract'))) {
    return; // Don't log this warning
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <CustomChakaraProvider>
        <App />
      </CustomChakaraProvider>
    </Provider>
  </StrictMode>
);
