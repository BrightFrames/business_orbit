"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhonePeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PhonePeService {
    /**
     * Generates the X-VERIFY header for PhonePe API requests.
     * Format: SHA256(base64Body + "/pg/v1/pay" + saltKey) + "###" + saltIndex
     */
    static generateChecksum(base64Body, endpoint = '/pg/v1/pay') {
        console.log('Generating checksum for endpoint:', endpoint);
        const dataToHash = base64Body + endpoint + this.saltKey;
        const hash = crypto_1.default.createHash('sha256').update(dataToHash).digest('hex');
        return `${hash}###${this.saltIndex}`;
    }
    /**
     * Prepares the base64 encoded payload and checksum for the payment initiation.
     */
    static preparePaymentRequest(params) {
        const payload = {
            merchantId: this.merchantId,
            merchantTransactionId: params.transactionId,
            merchantUserId: params.userId,
            amount: params.amount * 100, // PhonePe takes amount in paise
            redirectUrl: process.env.PHONEPE_REDIRECT_URL || '',
            redirectMode: 'GET',
            callbackUrl: process.env.PHONEPE_CALLBACK_URL || '',
            mobileNumber: params.mobileNumber,
            paymentInstrument: {
                type: 'PAY_PAGE',
            },
        };
        const base64Body = Buffer.from(JSON.stringify(payload)).toString('base64');
        // Dynamically extract endpoint from the full API URL to ensure checksum matches
        // e.g. https://api.phonepe.com/apis/hermes/pg/v1/pay -> /apis/hermes/pg/v1/pay
        const urlObj = new URL(this.apiUrl);
        const endpoint = urlObj.pathname;
        const checksum = this.generateChecksum(base64Body, endpoint);
        return {
            base64Body,
            checksum,
            apiUrl: this.apiUrl,
        };
    }
    /**
     * Verifies the checksum received in the PhonePe callback.
     * X-Verify: SHA256(base64Body + saltKey) + "###" + saltIndex
     */
    static verifyCallback(base64Body, receivedChecksum) {
        const dataToHash = base64Body + this.saltKey;
        const hash = crypto_1.default.createHash('sha256').update(dataToHash).digest('hex');
        const expectedChecksum = `${hash}###${this.saltIndex}`;
        return expectedChecksum === receivedChecksum;
    }
}
exports.PhonePeService = PhonePeService;
PhonePeService.merchantId = process.env.PHONEPE_MERCHANT_ID || '';
PhonePeService.saltKey = process.env.PHONEPE_SALT_KEY || '';
PhonePeService.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
PhonePeService.apiUrl = process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';
