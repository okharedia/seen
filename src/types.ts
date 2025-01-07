export interface Transaction {
    transactionId: number;
    authorizationCode: string;
    transactionDate: string;
    customerId: number;
    transactionType: string;
    transactionStatus: string;
    description: string;
    amount: number;
    metadata: {
        relatedTransactionId?: number;
        deviceId?: string;
    };
}
interface TimelineEntry {
    createdAt: string;
    status: string;
    amount: number;
}
export interface AggregatedTransaction {
    createdAt: string;
    updatedAt: string;
    transactionId: number;
    authorizationCode: string;
    status: string;
    description: string;
    transactionType: string;
    metadata: any;
    timeline: TimelineEntry[];
}
interface RelatedCustomer {
    relatedCustomerId: number;
    relationType: 'P2P_SEND' | 'P2P_RECEIVE' | 'DEVICE';
}
export interface CustomerRelationshipResponse {
    relatedCustomers: RelatedCustomer[];
}
