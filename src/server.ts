import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import { AggregatedTransaction, CustomerRelationshipResponse, Transaction } from './types';

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Express Server!' });
});

app.get('/api/transactions/:customerId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerId = parseInt(req.params.customerId);
        const response = await axios.get('https://cdn.seen.com/challenge/transactions-v2.json');
        const transactions: Transaction[] = response.data;

        // Filter transactions for the specific customer
        const customerTransactions = transactions.filter(t => t.customerId === customerId);

        // Group transactions by authorizationCode
        const groupedTransactions = customerTransactions.reduce((acc, curr) => {
            const key = curr.authorizationCode;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(curr);
            return acc;
        }, {} as Record<string, Transaction[]>);

        // Aggregate transactions
        const aggregatedTransactions: AggregatedTransaction[] = Object.values(groupedTransactions).map(group => {
            // Sort by date to get the first and last transactions
            const sortedGroup = group.sort((a, b) => 
                new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
            );
            
            const firstTx = sortedGroup[0];
            const lastTx = sortedGroup[sortedGroup.length - 1];

            return {
                createdAt: firstTx.transactionDate,
                updatedAt: lastTx.transactionDate,
                transactionId: firstTx.transactionId,
                authorizationCode: firstTx.authorizationCode,
                status: lastTx.transactionStatus,
                description: firstTx.description,
                transactionType: firstTx.transactionType,
                metadata: firstTx.metadata,
                timeline: sortedGroup.map(tx => ({
                    createdAt: tx.transactionDate,
                    status: tx.transactionStatus,
                    amount: tx.amount
                }))
            };
        });

        res.json({ transactions: aggregatedTransactions });
    } catch (error) {
        next(error);
    }
});

app.get('/api/customers/:customerId/relationships', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerId = parseInt(req.params.customerId);
        const response = await axios.get('https://cdn.seen.com/challenge/transactions-v2.json');
        const transactions: Transaction[] = response.data;
        const customerTransactions = transactions.filter(t => t.customerId === customerId);
        // Find all devices used by the target customer
        const customerDevices = new Set(
            customerTransactions
                .filter(t => t.metadata?.deviceId)
                .map(t => t.metadata.deviceId)
        );

        // 1. Store relationships in a Map where:
        //    - Key: related customer ID
        //    - Value: Set of relationship types
        //    e.g { 1:  { 'P2P_SEND', 'P2P_RECEIVE', 'DEVICE' } }
        //       - 1 did a P2P_SEND to target customer at some point
        //       - 1 received P2P_RECEIVE from target customer at some point
        //       - 1 has used the same DEVICE with target customer
        const relatedCustomers = new Map<number, Set<string>>();

       
        customerTransactions.forEach(transaction => {
            // 2. Find P2P_SEND relationships
            //    - Find the corresponding RECEIVE transaction
            //    - Add the RECEIVE transaction's customer ID to the related customers map with the 'P2P_SEND' relationship type
            if (transaction.transactionType === 'P2P_SEND') {
                // Find the corresponding RECEIVE transaction
                const receiveTransaction = transactions.find(t => 
                    t.metadata?.relatedTransactionId === transaction.transactionId
                );
                if (receiveTransaction) {
                    if (!relatedCustomers.has(receiveTransaction.customerId)) {
                        relatedCustomers.set(receiveTransaction.customerId, new Set());
                    }
                    relatedCustomers.get(receiveTransaction.customerId)?.add('P2P_SEND');
                }
            }

            // 3. Find P2P_RECEIVE relationships
            //    - Find the corresponding SEND transaction
            //    - Add the SEND transaction's customer ID to the related customers map with the 'P2P_RECEIVE' relationship type
            if (transaction.transactionType === 'P2P_RECEIVE') {
                // Find the corresponding SEND transaction
                const sendTransaction = transactions.find(t => 
                    t.transactionId === transaction.metadata?.relatedTransactionId
                );
                if (sendTransaction) {
                    if (!relatedCustomers.has(sendTransaction.customerId)) {
                        relatedCustomers.set(sendTransaction.customerId, new Set());
                    }
                    relatedCustomers.get(sendTransaction.customerId)?.add('P2P_RECEIVE');
                }
            }
        });

        // 4. Find device relationships
        //    - Iterate through all transactions not performed by the target customer
        //    - Check if the device has been used by the target customer
        //    - Add the transaction's customer ID to the related customers map with the 'DEVICE' relationship type
        transactions.forEach(transaction => {
            if (transaction.customerId !== customerId && 
                transaction.metadata?.deviceId && 
                customerDevices.has(transaction.metadata.deviceId)) {
                
                if (!relatedCustomers.has(transaction.customerId)) {
                    relatedCustomers.set(transaction.customerId, new Set());
                }
                relatedCustomers.get(transaction.customerId)?.add('DEVICE');
            }
        });

        // Format the response
        const result: CustomerRelationshipResponse = {
            relatedCustomers: Array.from(relatedCustomers.entries()).flatMap(([customerId, relationTypes]) => 
                Array.from(relationTypes).map(relationType => ({
                    relatedCustomerId: customerId,
                    relationType: relationType as 'P2P_SEND' | 'P2P_RECEIVE' | 'DEVICE'
                }))
            )
        };

        res.json(result);
    } catch (error) {
        next(error);
    }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: err.message 
    });
});

app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
    const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} 