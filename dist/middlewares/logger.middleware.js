"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const requestLogger = (req, res, next) => {
    const { method, url, params, query, body } = req;
    // Log request
    logger_1.default.info(`Request => Method: ${method}, URL: ${url}, Params: ${JSON.stringify(params)}, Query: ${JSON.stringify(query)}, Body: ${JSON.stringify(body)}`);
    // Capture response data
    const oldSend = res.send;
    res.send = function (data) {
        logger_1.default.info(`Response => Method: ${method}, URL: ${url}, Status: ${res.statusCode}, Response: ${data}`);
        // @ts-ignore
        oldSend.apply(res, arguments);
        return res;
    };
    next();
};
exports.requestLogger = requestLogger;
