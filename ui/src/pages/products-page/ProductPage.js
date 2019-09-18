import React from "react";

import ProductsContainer from "../../containers/products-container/ProductsContainer";
import CommandsContainer from "../../containers/commands-container/CommandsContainer";
import ShoppingCart from "../../components/shopping-cart/ShoppingCart";

import "./ProductPage.css";

function ProductPage() {
  return (
    <div className="main">
      <section>
        <article>
          <h2>Commands</h2>
          <CommandsContainer />
        </article>
        <article>
          <h2>Products</h2>
          <ProductsContainer />
        </article>
      </section>
      <aside>
        <ShoppingCart />
      </aside>
    </div>
  );
}

export default ProductPage;
