const request = require('supertest');
const app = require('../app'); // Express app

describe('Profile API Tests', () => {
    let token;

    const user = {
        email: 'profiletest@example.com',
        password: '12345678',
    };

    const updateData = {
        name: 'Updated Name',
        phone: '0123456789',
        address: 'Hà Nội',
    };

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(user);

        token = res.body.accessToken;
    });
});
