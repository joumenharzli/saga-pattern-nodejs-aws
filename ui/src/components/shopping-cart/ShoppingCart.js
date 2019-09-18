import React from "react";

function ShoppingCart(props) {
  return (
    <div>
      <h3>Shopping Cart</h3>
      <ul>
        {props.items.map(item => (
          <li>{item.id}</li>
        ))}
      </ul>
      <input type="button" onClick={props.createCommand} value="Create" />
    </div>
  );
}

ShoppingCart.defaultProps = {
  items: []
};

export default ShoppingCart;
