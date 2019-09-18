import React from "react";
import "./ProductsList.css";

function ProductsList(props) {
  return (
    <div>
      {props.loading ? (
        <b>Loading</b>
      ) : (
        <ul>
          {props.products.map(product => (
            <li key={product.id}>
              <img src="https://picsum.photos/200" alt="random" />
              <div>
                <b>{product.name}</b>
              </div>
              <div>Price: {product.price} €</div>
              <div>Count: {product.count}</div>
              <div>Id: {product.id}</div>
              <input
                type="button"
                onClick={() => props.deleteProduct(product.id)}
                value="Delete"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductsList;
