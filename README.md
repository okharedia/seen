# Transaction API Server

A Node.js Express server that provides APIs for handling customer transactions and relationships.

## Features

- Get aggregated transactions for a specific customer
- Get customer relationships based on P2P transactions and shared devices

## Prerequisites

- Node.js (v14 or higher)
- npm
- TypeScript

## Installation

1. Clone the repository:
```
git clone <repository-url>
```
2. Install dependencies:
```
npm install
```

## Running the Project

### Development Mode
```
npm run dev
```

### Production Mode
```
npm run build
npm start
```

## API Endpoints

### Get Aggregated Transactions
```
GET /api/transactions/:customerId
```
Returns aggregated transactions for a specific customer, grouped by authorization code with a timeline of status changes.

### Get Customer Relationships
```
GET /api/customers/:customerId/relationships
```
Returns customer relationships based on:
- P2P transactions sent
- P2P transactions received
- Shared device usage

## Error Handling

The API includes comprehensive error handling:
- 404 for routes not found
- 500 for internal server errors
- Detailed error messages in development
