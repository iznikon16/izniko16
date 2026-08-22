export type QuantityControlledProduct = {
  minimum_order_quantity: number;
  stock_quantity: number;
};

export function getOrderQuantityError(product: QuantityControlledProduct, requestedQuantity: number) {
  const minimum = Math.max(1, Math.trunc(product.minimum_order_quantity) || 1);
  const stock = Math.max(0, Math.trunc(product.stock_quantity) || 0);
  const requested = Math.trunc(requestedQuantity);

  if (requested < minimum) {
    return `Bu ürün için minimum sipariş adedi ${minimum}'tir.`;
  }
  if (requested > stock) {
    return 'Talep edilen miktar mevcut stoktan fazla.';
  }
  return null;
}

export function assertOrderQuantity(product: QuantityControlledProduct, requestedQuantity: number) {
  const error = getOrderQuantityError(product, requestedQuantity);
  if (error) throw new Error(error);
}
