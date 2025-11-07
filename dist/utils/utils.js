"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImagePublicId = void 0;
const getImagePublicId = (imageUrl) => {
    return imageUrl.split("/").pop()?.split(".")[0];
};
exports.getImagePublicId = getImagePublicId;
