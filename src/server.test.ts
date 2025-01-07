import axios from 'axios';
import request from 'supertest';
import { Transaction } from './types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

import { app } from './server';

describe('Server Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return welcome message', async () => {
            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Welcome to the Express Server!' });
        });
    });

    describe('GET /api/transactions/:customerId', () => {
        const mockTransactions: Transaction[] = [
            {
                transactionId: 1,
                customerId: 1,
                transactionDate: '2024-01-01T00:00:00Z',
                transactionStatus: 'COMPLETED',
                authorizationCode: 'AUTH1',
                description: 'Test Transaction 1',
                transactionType: 'P2P_SEND',
                amount: 100,
                metadata: { deviceId: 'device1' }
            },
            {
                transactionId: 2,
                customerId: 1,
                transactionDate: '2024-01-02T00:00:00Z',
                transactionStatus: 'PENDING',
                authorizationCode: 'AUTH1',
                description: 'Test Transaction 1 Update',
                transactionType: 'P2P_SEND',
                amount: 100,
                metadata: { deviceId: 'device1' }
            }
        ];

        it('should aggregate transactions correctly', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

            const response = await request(app).get('/api/transactions/1');
            
            expect(response.status).toBe(200);
            expect(response.body.transactions).toHaveLength(1);
            expect(response.body.transactions[0]).toMatchObject({
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
                authorizationCode: 'AUTH1',
                status: 'PENDING',
                timeline: expect.arrayContaining([
                    expect.objectContaining({
                        status: 'COMPLETED',
                        amount: 100
                    }),
                    expect.objectContaining({
                        status: 'PENDING',
                        amount: 100
                    })
                ])
            });
        });
    });

    describe('GET /api/customers/:customerId/relationships', () => {
        const mockTransactions: Transaction[] = [
            {
                transactionId: 1,
                customerId: 1,
                transactionDate: '2024-01-01T00:00:00Z',
                transactionStatus: 'COMPLETED',
                authorizationCode: 'AUTH1',
                description: 'Send Money',
                transactionType: 'P2P_SEND',
                amount: 100,
                metadata: { deviceId: 'device1', relatedTransactionId: 2 }
            },
            {
                transactionId: 2,
                customerId: 2,
                transactionDate: '2024-01-01T00:00:00Z',
                transactionStatus: 'COMPLETED',
                authorizationCode: 'AUTH2',
                description: 'Receive Money',
                transactionType: 'P2P_RECEIVE',
                amount: 100,
                metadata: { deviceId: 'device2', relatedTransactionId: 1 }
            }
        ];

        it('should identify P2P relationships correctly', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

            const response = await request(app).get('/api/customers/1/relationships');
            
            expect(response.status).toBe(200);
            expect(response.body.relatedCustomers).toEqual(
                expect.arrayContaining([
                    {
                        relatedCustomerId: 2,
                        relationType: 'P2P_SEND'
                    }
                ])
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 routes', async () => {
            const response = await request(app).get('/nonexistent');
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ message: 'Route not found' });
        });

        it('should handle server errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            const response = await request(app).get('/api/transactions/1');
            expect(response.status).toBe(500);
            expect(response.body).toMatchObject({
                message: 'Something went wrong!',
                error: 'API Error'
            });
        });
    });
}); 