# Payment Gateway Testing Framework

## Overview
This module provides a unified testing interface for multiple payment gateways including Stripe, Adyen, Square, and Braintree. It includes both real sandbox testing (with API keys) and mock fallback functionality for development.

## Setup

### 1. Install Dependencies
```bash
npm install stripe @adyen/api-library square braintree
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and add your test API keys:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Adyen
ADYEN_API_KEY=test_your_api_key_here
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccountTest

# Square
SQUARE_ACCESS_TOKEN=sandbox_access_token_here
SQUARE_ENVIRONMENT=sandbox

# Braintree
BRAINTREE_MERCHANT_ID=your_merchant_id
BRAINTREE_PUBLIC_KEY=your_public_key
BRAINTREE_PRIVATE_KEY=your_private_key
```

**Note:** To use mock mode for any gateway, either leave the keys empty or set them to 'mock'.

## API Endpoint

### POST /api/test-payment

Test a payment with a specific gateway.

**Request Body:**
```json
{
  "cardNumber": "4242424242424242",
  "exp_month": "12",
  "exp_year": "25",
  "cvc": "123",
  "gateway": "stripe",
  "amount": 1000,
  "holder_name": "Test User"
}
```

**Parameters:**
- `cardNumber` (required): Card number to test
- `exp_month` (required): Expiration month (1-12)
- `exp_year` (required): Expiration year (2 or 4 digits)
- `cvc` (required): Card verification code
- `gateway` (required): One of: `stripe`, `adyen`, `square`, `braintree`
- `amount` (optional): Amount in cents (default: 1000)
- `holder_name` (optional): Cardholder name (default: "Test User")

**Response:**
```json
{
  "success": true,
  "gateway": "Stripe",
  "transactionId": "pi_3XXXXXX",
  "status": "succeeded",
  "amount": 1000,
  "currency": "usd",
  "cardDetails": {
    "brand": "visa",
    "last4": "4242",
    "fingerprint": "xxxx"
  },
  "mock": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Test Cards

### Stripe
- Success: `4242424242424242`
- Decline: `4000000000000002`
- Requires Auth: `4000002500003155`

### Adyen
- Success: `4111111111111111`
- Decline: `4000020000000000`

### Square
- Success: Use nonce `cnon:card-nonce-ok` (sandbox only)
- Decline: Use nonce `cnon:card-nonce-declined`

### Braintree
- Success: `4111111111111111`
- Decline: `4000111111111115`
- MasterCard: `5555555555554444`

## Mock Mode

When API keys are not configured or set to 'mock', the system will use mock responses:
- Test cards starting with `4242`, `4111`, or `5555` will return success
- Other cards will return failure
- Mock responses include a `mock: true` flag

## UI Integration

The React UI includes a `PaymentTester` component that:
1. Allows selection of payment gateway
2. Auto-fills card details from generated cards
3. Displays formatted response with status codes
4. Shows error details for failed transactions
5. Indicates when running in mock mode

## File Structure

```
server/
├── gateways/
│   ├── index.ts       # Main export file
│   ├── stripe.js      # Stripe gateway implementation
│   ├── adyen.js       # Adyen gateway implementation
│   ├── square.js      # Square gateway implementation
│   └── braintree.js   # Braintree gateway implementation
├── payment-route.js   # Express route handler
└── routes.ts          # Main routes file (updated)

client/src/
├── components/
│   └── PaymentTester.tsx  # React component for testing
└── pages/
    └── generator-optimized.tsx  # Updated with PaymentTester
```

## Security Notes

1. **Never use production API keys** - Always use test/sandbox keys
2. **Environment Variables** - Keep API keys in `.env` file (never commit)
3. **HTTPS Only** - In production, always use HTTPS for payment endpoints
4. **PCI Compliance** - This is for testing only; production requires PCI compliance
5. **Rate Limiting** - Consider adding rate limiting to prevent abuse

## Troubleshooting

### Gateway not working
- Check API keys are correctly set in `.env`
- Verify you're using test/sandbox keys, not production
- Check console logs for detailed error messages

### Mock mode activating unexpectedly
- Ensure environment variables are loaded (`dotenv` configured)
- Check that keys are not set to the string 'mock'
- Verify `.env` file is in the project root

### Card declined errors
- Use the test card numbers provided above
- Check expiration date is in the future
- Ensure CVC is correct length (3 or 4 digits)

## Development Workflow

1. Start with mock mode (no API keys)
2. Test UI integration and response handling
3. Add real test API keys one gateway at a time
4. Verify each gateway works correctly
5. Test error handling with invalid cards

## Future Enhancements

- [ ] Add more payment gateways (PayPal, Authorize.net)
- [ ] Implement webhook handling for async payments
- [ ] Add 3D Secure authentication flow
- [ ] Create batch testing for multiple cards
- [ ] Add performance metrics and response time logging
- [ ] Implement retry logic for failed transactions
