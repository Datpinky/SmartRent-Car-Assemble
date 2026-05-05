const request = require('supertest');
const app = require('../app');

describe('User Location API Tests - Geolocation System', () => {
    let token;
    let locationId;

    const user = {
        email: 'locationtest@example.com',
        password: '12345678',
    };

    const locationPayload = {
        latitude: 16.0544,
        longitude: 108.2022,
        address: 'Da Nang, Vietnam',
    };
});
