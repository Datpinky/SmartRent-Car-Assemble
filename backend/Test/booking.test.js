const request = require('supertest');
const app = require('../app'); // Express app

describe('Booking API Tests', () => {
    let token;
    let bookingId;

    const user = {
        email: 'bookingtest@example.com',
        password: '12345678',
    };

    const bookingData = {
        serviceId: '1234567890abcdef',
        date: '2026-05-10',
        time: '10:00',
        note: 'Test booking',
    };
});
