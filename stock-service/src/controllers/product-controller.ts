import { Request, Response, NextFunction } from "express";
import { productService } from "services/product-service";

class ProductController {
  insert = (req: Request, res: Response, next: NextFunction) => {
    const product = {
      name: req.body.name,
      price: req.body.price,
      count: req.body.count
    };

    productService.insert(product, (err, data) => {
      if (err) return next(err);
      res
        .status(201)
        .header(
          "Location",
          req.protocol + "://" + req.hostname + "/" + req.url + "/" + data.id
        )
        .send(product);
    });
  };

  delete = (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    productService.delete(id, err => {
      if (err) return next(err);
      res.status(200).end();
    });
  };

  findAll = (req: Request, res: Response, next: NextFunction) => {
    productService.findAll((err, data) => {
      if (err) return next(err);
      res.send(data.Items);
    });
  };
}

const productController = new ProductController();
export { productController };
