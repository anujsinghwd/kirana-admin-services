"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressImageTo70KB = void 0;
const sharp_1 = __importDefault(require("sharp"));
const compressImageTo70KB = async (inputBuffer) => {
    const MAX_SIZE = 70 * 1024; // 70KB
    let quality = 80;
    let outputBuffer = await (0, sharp_1.default)(inputBuffer)
        .resize({ width: 800 }) // 🔥 resize for optimization
        .jpeg({ quality })
        .toBuffer();
    // 🔁 Reduce quality until under 70KB
    while (outputBuffer.length > MAX_SIZE && quality > 10) {
        quality -= 10;
        outputBuffer = await (0, sharp_1.default)(inputBuffer)
            .resize({ width: 800 })
            .jpeg({ quality })
            .toBuffer();
    }
    return outputBuffer;
};
exports.compressImageTo70KB = compressImageTo70KB;
