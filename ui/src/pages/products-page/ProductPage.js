import React from "react";

import ProductsContainer from "../../containers/products-container/ProductsContainer";
import CommandsContainer from "../../containers/commands-container/CommandsContainer";

function ProductPage() {
  return (
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
  );
}

export default ProductPage;
