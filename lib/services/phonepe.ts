import crypto from 'crypto';

export interface PhonePePaymentRequest {
    merchantId: string;
    merchantTransactionId: string;
    merchantUserId: string;
    amount: number;
    redirectUrl: string;
    redirectMode: 'POST' | 'GET';
    callbackUrl: string;
    mobileNumber?: string;
    paymentInstrument: {
        type: 'PAY_PAGE';
    };
}

export class PhonePeService {
    private static merchantId = process.env.PHONEPE_MERCHANT_ID || '';
    private static saltKey = process.env.PHONEPE_SALT_KEY || '';
    private static saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    private static apiUrl = process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    /**
     * Generates the X-VERIFY header for PhonePe API requests.
     * Format: SHA256(base64Body + "/pg/v1/pay" + saltKey) + "###" + saltIndex
     */
    static generateChecksum(base64Body: string, endpoint: string = '/pg/v1/pay'): string {
        const dataToHash = base64Body + endpoint + this.saltKey;
        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        return `${hash}###${this.saltIndex}`;
    }

    /**
     * Prepares the base64 encoded payload and checksum for the payment initiation.
     */
    static preparePaymentRequest(params: {
        transactionId: string;
        userId: string;
        amount: number;
        mobileNumber?: string;
    }) {
        const payload: PhonePePaymentRequest = {
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
        const checksum = this.generateChecksum(base64Body);

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
    static verifyCallback(base64Body: string, receivedChecksum: string): boolean {
        const dataToHash = base64Body + this.saltKey;
        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        const expectedChecksum = `${hash}###${this.saltIndex}`;
        return expectedChecksum === receivedChecksum;
    }
}
