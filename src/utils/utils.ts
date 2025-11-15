export const getImagePublicId = (imageUrl: string) => {
  return imageUrl.split("/").pop()?.split(".")[0];
};

export const pricewithDiscount = (price: number, discount = 0) => {
    const discountAmount = Math.ceil((price * discount) / 100);
    return price - discountAmount;
};

export const generateOrderId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${random}`;
};
