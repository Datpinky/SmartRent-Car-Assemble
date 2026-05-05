const request = require('supertest');
const app = require('../app');

describe('Review API Tests - Product/Service Rating System', () => {
    let token;
    let reviewId;

    const user = {
        email: 'reviewtest@example.com',
        password: '12345678',
    };

    const targetId = '64f1a9c8c1a2b3d4e5f67890'; // product/service id

    const reviewPayload = {
        targetId,
        rating: 5,
        comment: 'Service is excellent, very satisfied!',
    };
});
