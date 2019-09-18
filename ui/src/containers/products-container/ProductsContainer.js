import React, { useState, useEffect } from "react";
import axios from "axios";
import env from "../../enviroment";

import ProductsList from "../../components/products-list/ProductsList";
import ProductForm from "../../components/product-form/ProductForm";

function ProductsContainer() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadProducts() {
    const req = await axios.get(env.PRODUCTS_URL + "/products");
    setProducts(req.data);
    setLoading(false);
  }

  async function createProduct(event) {
    event.preventDefault();

    const data = {
      name: event.target.name.value,
      price: event.target.price.value,
      count: event.target.count.value
    };

    setSaving(true);
    await axios.post(env.PRODUCTS_URL + "/products", data);
    setSaving(false);
    loadProducts();
  }

  async function deleteProduct(id) {
    setDeleting(true);
    await axios.delete(env.PRODUCTS_URL + "/products/" + id);
    setDeleting(false);
    loadProducts();
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      <h2>Products</h2>
      <ProductForm saving={saving} createProduct={createProduct} />
      <ProductsList
        products={products}
        loading={loading}
        deleteProduct={deleteProduct}
        deleting={deleting}
      />
    </div>
  );
}

export default ProductsContainer;
