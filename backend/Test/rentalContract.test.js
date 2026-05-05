const request = require('supertest');
const app = require('../app');

describe('Rental Contract API - Full Flow Tests', () => {
    let token;
    let contractId;
    let propertyId = '64f1a9c8c1a2b3d4e5f67890';

    const user = {
        email: 'rentaltest@example.com',
        password: '12345678',
    };

    const contractPayload = {
        propertyId,
        startDate: '2026-06-01',
        endDate: '2026-12-01',
        monthlyRent: 8000000,
        deposit: 16000000,
        tenantNote: 'I want a quiet room near center',
    };
});
