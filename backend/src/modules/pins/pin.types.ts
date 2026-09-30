export interface PinView {
  id: string;
  maskedCode: string;
  serialNumber: string | null;
  soldAt: Date | null;
  order: { id: string; orderNumber: string; createdAt: Date; escrowStatus: string } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string;
    brand: string;
    region: string;
    variantTitle: string;
    denomination: string;
  };
}

export interface RevealedPin {
  id: string;
  code: string;
  serialNumber: string | null;
  soldAt: Date | null;
  productTitle: string;
  variantTitle: string;
  denomination: string;
}
