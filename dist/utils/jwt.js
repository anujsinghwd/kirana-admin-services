"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config/config"));
const signToken = (payload) => {
    const options = {
        expiresIn: config_1.default.JWT_EXPIRES_IN
    };
    return jsonwebtoken_1.default.sign(payload, config_1.default.JWT_SECRET, options);
};
exports.signToken = signToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
};
exports.verifyToken = verifyToken;
