const request = require('supertest');
const app = require('../app'); // Express app

describe('Favorite API Tests', () => {
    let token;
    let favoriteId;

    const user = {
        email: 'favoritetest@example.com',
        password: '12345678',
    };

    const productId = '1234567890abcdef';
});
