import * as uuid from "uuid/v4";

import env from "@app/env";
import { productRepository } from "@app/repositories";
import { productListener } from "@app/messages";

class ProductService {
  constructor() {
    setInterval(() => productListener.listen(), env.POLL_SQS_PERIOD);
  }

  insert = (product, callback) => {
    const id = uuid();
    product.id = id;

    productRepository.insert(product, err => {
      if (err) return callback(err, null);
      callback(null, product);
    });
  };

  delete = (id: string, callback) => {
    productRepository.delete(id, callback);
  };

  findAll = callback => {
    productRepository.findAll(callback);
  };
}

const productService = new ProductService();
export { productService };
