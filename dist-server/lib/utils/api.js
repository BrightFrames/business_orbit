"use strict";
// Utility functions for API calls and error handling
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeApiCall = safeApiCall;
exports.debounce = debounce;
exports.formatMemberCount = formatMemberCount;
exports.isValidEmail = isValidEmail;
exports.generateRandomMemberCount = generateRandomMemberCount;
async function safeApiCall(apiCall, errorMessage = 'An error occurred') {
    try {
        const response = await apiCall();
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || errorData.message || errorMessage
            };
        }
        const data = await response.json();
        return {
            success: true,
            data
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : errorMessage
        };
    }
}
// Debounce utility for search and input handling
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
// Format member count for display
function formatMemberCount(count) {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
}
// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Generate random member count for demo purposes
function generateRandomMemberCount(type) {
    const base = type === 'chapter' ? 100 : 50;
    const variation = type === 'chapter' ? 500 : 200;
    return base + Math.floor(Math.random() * variation);
}
