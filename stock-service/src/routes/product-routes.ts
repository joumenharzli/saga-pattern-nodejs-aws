import { Router } from "express";
import { productController } from "@app/controllers";

const productRoutes = Router();

productRoutes.post("/products", productController.insert);
productRoutes.delete("/products/:id", productController.delete);
productRoutes.get("/products", productController.findAll);

export { productRoutes };
