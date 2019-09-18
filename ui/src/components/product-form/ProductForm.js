import React from "react";

function ProductForm(props) {
  return (
    <form onSubmit={props.createProduct}>
      <label>Name</label>
      <input name="name" type="text" />
      <label>Price</label>
      <input name="price" type="number" step="0.01" />
      <label>Count</label>
      <input name="count" type="number" />
      {props.saving ? (
        <b>Loading...</b>
      ) : (
        <input type="submit" value="Create" />
      )}
    </form>
  );
}

export default ProductForm;
