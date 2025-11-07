"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ERROR_MESSAGES = {
    PRODUCT: {
        NOT_FOUND: "Product not found",
        DUPLICATE: "Product with same name already exists in this category",
        CREATE_FAIL: "Failed to create product",
        UPDATE_FAIL: "Failed to update product",
        DELETE_FAIL: "Failed to delete product",
        FETCH_FAIL: "Failed to fetch products",
    },
    CATEGORY: {
        NOT_FOUND: "Category not found",
        CREATE_FAIL: "Failed to create category",
        UPDATE_FAIL: "Failed to update category",
        DELETE_FAIL: "Failed to delete category",
        DELETE_SUCCESS: "Category deleted successfully",
        FETCH_FAIL: "Failed to fetch categories",
        IMAGE_NOT_FOUND: "Category Image not found"
    },
    SUBCATEGORY: {
        NOT_FOUND: "SubCategory not found",
        CREATE_FAIL: "Failed to create subcategory",
        UPDATE_FAIL: "Failed to update subcategory",
        DELETE_FAIL: "Failed to delete subcategory",
        DELETE_SUCCESS: "SubCategory deleted successfully",
        FETCH_FAIL: "Failed to fetch categories",
        IMAGE_NOT_FOUND: "SubCategory Image not found",
        INVALID_CATEGORY_ID: "Invalid categoryId"
    },
    ORDER: {
        NOT_FOUND: "Order not found",
        CREATE_FAIL: "Failed to create order",
        UPDATE_FAIL: "Failed to update order",
        DELETE_FAIL: "Failed to delete order",
        FETCH_FAIL: "Failed to fetch orders",
    },
    GENERAL: {
        INTERNAL_SERVER_ERROR: "Internal Server Error",
        INVALID_REQUEST: "Invalid request",
    },
    USER: {
        EMAIL_EXISTS: "Email already exists",
        EMAIL_PASS_REQ: "Email and password required",
        INVALID_EMAIL_PASS: "Invalid email or password"
    },
    AUTH: {
        MISSING_TOKEN: "Not authorized, token missing",
        USER_NOT_FOUND: "No user found with this token",
        PERMISSION_ISSUE: "You do not have permission to perform this action"
    }
};
exports.default = ERROR_MESSAGES;
