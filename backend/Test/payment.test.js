const request = require('supertest');
const app = require('../app'); // Express app

describe('Payment API Tests', () => {
    let token;
    let paymentId;

    const user = {
        email: 'paymenttest@example.com',
        password: '12345678',
    };

    const orderId = '1234567890abcdef';
});
