export type CommerceCouponSnapshot = {
  code: string;
  description: string;
  discountAmount: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  title: string;
};

export type CommerceCartLineSnapshot = {
  id: string;
  lineTotal: number;
  product: {
    brandName: string | null;
    featuredImageUrl: string | null;
    id: string;
    priceLabel: string;
    summary: string;
    title: string;
  };
  productHref: string;
  quantity: number;
  unitPrice: number | null;
};

export type CommerceCartSnapshot = {
  checkoutReady: boolean;
  coupon: CommerceCouponSnapshot | null;
  discountTotal: number;
  itemCount: number;
  lines: CommerceCartLineSnapshot[];
  subtotal: number;
  total: number;
};

export type CommerceCartResponse = {
  authenticated: boolean;
  cart: CommerceCartSnapshot;
};

export type CommerceFavoritesResponse = {
  authenticated: boolean;
  productIds: string[];
};

export type CommerceErrorResponse = {
  error: string;
  loginUrl?: string;
};
