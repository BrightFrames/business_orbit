// Setup mock environment variables
process.env.PHONEPE_MERCHANT_ID = 'MERCHANT_ID';
process.env.PHONEPE_SALT_KEY = 'SALT_KEY';
process.env.PHONEPE_SALT_INDEX = '1';

import { PhonePeService } from '../lib/services/phonepe';
import crypto from 'crypto';

// Override private static properties for testing since they are initialized at module load
(PhonePeService as any).merchantId = process.env.PHONEPE_MERCHANT_ID;
(PhonePeService as any).saltKey = process.env.PHONEPE_SALT_KEY;
(PhonePeService as any).saltIndex = process.env.PHONEPE_SALT_INDEX;

console.log('--- PhonePe Payment Gateway Integration Test ---');

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
    console.log('\n1. Testing Checksum Generation...');
    const base64Body = Buffer.from(JSON.stringify({ test: 'data' })).toString('base64');
    const endpoint = '/pg/v1/pay';
    const checksum = PhonePeService.generateChecksum(base64Body, endpoint);

    // Manual checksum calculation to verify the logic
    const dataToHash = base64Body + endpoint + process.env.PHONEPE_SALT_KEY;
    const expectedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    const expectedChecksum = `${expectedHash}###${process.env.PHONEPE_SALT_INDEX}`;

    assert(checksum === expectedChecksum, 'Checksum should match the expected SHA256 hash format');

    console.log('\n2. Testing Payment Request Preparation...');
    const params = {
        transactionId: 'TX12345',
        userId: 'USER123',
        amount: 500, // 500 INR
        mobileNumber: '9999999999'
    };
    const { base64Body: reqBody, checksum: reqChecksum, apiUrl } = PhonePeService.preparePaymentRequest(params);

    assert(!!reqBody, 'Request body should be present');
    assert(!!reqChecksum, 'Checksum should be present');
    assert(apiUrl.includes('phonepe.com'), 'API URL should be a PhonePe endpoint');

    const decodedBody = JSON.parse(Buffer.from(reqBody, 'base64').toString('utf-8'));
    assert(decodedBody.amount === 50000, 'Amount should be converted to paise (500 * 100)');
    assert(decodedBody.merchantTransactionId === params.transactionId, 'Transaction ID should match');
    assert(decodedBody.merchantUserId === params.userId, 'User ID should match');

    console.log('\n3. Testing Callback Verification...');
    // Simulate a successful response payload
    const callbackPayload = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
            merchantTransactionId: 'TX12345',
            transactionId: 'PROV123',
            amount: 50000,
            paymentInstrument: { type: 'UPI' }
        }
    };
    const callbackBase64 = Buffer.from(JSON.stringify(callbackPayload)).toString('base64');

    // Generate valid checksum for callback
    const callbackDataToHash = callbackBase64 + process.env.PHONEPE_SALT_KEY;
    const callbackHash = crypto.createHash('sha256').update(callbackDataToHash).digest('hex');
    const callbackChecksum = `${callbackHash}###${process.env.PHONEPE_SALT_INDEX}`;

    const isCallbackValid = PhonePeService.verifyCallback(callbackBase64, callbackChecksum);
    assert(isCallbackValid === true, 'Callback verification should succeed with correct checksum');

    const isCallbackInvalid = PhonePeService.verifyCallback(callbackBase64, 'WRONG_CHECKSUM');
    assert(isCallbackInvalid === false, 'Callback verification should fail with incorrect checksum');

    console.log('\n--- All service tests passed! ---');
    console.log('\nNote: Database updates were not tested in this script to avoid side effects.');
    console.log('You can now use these utilities in your API routes with confidence.');
}

runTests().catch(err => {
    console.error('Test run error:', err);
    process.exit(1);
});
