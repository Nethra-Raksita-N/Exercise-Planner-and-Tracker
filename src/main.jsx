import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import exercisesData from "./data/exercises.json";
import quotesData from "./data/quotes.json";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);