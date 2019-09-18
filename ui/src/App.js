import React from "react";
import "./App.css";
import ProductPage from "./pages/products-page/ProductPage";

function App() {
  return (
    <div>
      <header>
        <h1>Saga Poc</h1>
      </header>
      <section>
        <ProductPage />
      </section>
    </div>
  );
}

export default App;
