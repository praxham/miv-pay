/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import "./index.css";
import { createRoot } from "react-dom/client";
import { Bounce, ToastContainer } from "react-toastify";
import Pay from "./pages/Pay";

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <div className="mx-auto my-4 p-4 lg:p-0">
      <Pay />
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
    </div>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
