"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderId = exports.pricewithDiscount = exports.getImagePublicId = void 0;
const getImagePublicId = (imageUrl) => {
    return imageUrl.split("/").pop()?.split(".")[0];
};
exports.getImagePublicId = getImagePublicId;
const pricewithDiscount = (price, discount = 0) => {
    const discountAmount = Math.ceil((price * discount) / 100);
    return price - discountAmount;
};
exports.pricewithDiscount = pricewithDiscount;
const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
};
exports.generateOrderId = generateOrderId;
