import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import CreatePaymentLink from "./pages/CreatePaymentLink";
import Pay from "./pages/Pay";
import { HelmetProvider } from "react-helmet-async";

export function App() {
  return (
    <BrowserRouter>
      <HelmetProvider>
        <Routes>
          <Route path="/" element={<CreatePaymentLink />} />
          <Route path="/pay" element={<Pay />} />
        </Routes>
      </HelmetProvider>
    </BrowserRouter>
  );
}

export default App;
