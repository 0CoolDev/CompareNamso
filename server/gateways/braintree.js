const braintree = require('braintree');

class BraintreeGateway {
  constructor() {
    const merchantId = process.env.BRAINTREE_MERCHANT_ID;
    const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
    const privateKey = process.env.BRAINTREE_PRIVATE_KEY;
    
    if (merchantId && publicKey && privateKey && merchantId !== 'mock') {
      this.gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId,
        publicKey,
        privateKey
      });
      this.isMock = false;
    } else {
      this.isMock = true;
    }
  }

  async processPayment(cardData, amount = 10.00) {
    if (this.isMock) {
      return this.mockPayment(cardData);
    }

    try {
      // For testing, we'll use a test nonce since we can't tokenize cards directly
      // In production, you'd tokenize the card on the frontend first
      const result = await this.gateway.transaction.sale({
        amount: (amount / 100).toFixed(2), // Braintree expects decimal format
        paymentMethodNonce: 'fake-valid-nonce', // Test nonce for sandbox
        creditCard: {
          number: cardData.number,
          expirationMonth: cardData.exp_month,
          expirationYear: cardData.exp_year,
          cvv: cardData.cvc,
          cardholderName: cardData.holder_name || 'Test User'
        },
        options: {
          submitForSettlement: true
        }
      });

      if (result.success) {
        const transaction = result.transaction;
        return {
          success: true,
          gateway: 'Braintree',
          transactionId: transaction.id,
          status: transaction.status,
          amount: parseFloat(transaction.amount) * 100,
          currency: transaction.currencyIsoCode,
          cardDetails: {
            brand: transaction.creditCard?.cardType,
            last4: transaction.creditCard?.last4,
            fingerprint: transaction.creditCard?.uniqueNumberIdentifier
          },
          processorResponse: {
            code: transaction.processorResponseCode,
            text: transaction.processorResponseText
          },
          raw: transaction
        };
      } else {
        return {
          success: false,
          gateway: 'Braintree',
          error: result.message,
          errors: result.errors.deepErrors(),
          verification: result.verification
        };
      }
    } catch (error) {
      return {
        success: false,
        gateway: 'Braintree',
        error: error.message,
        type: error.type
      };
    }
  }

  mockPayment(cardData) {
    const last4 = cardData.number.slice(-4);
    const isTestCard = cardData.number.startsWith('4111') || 
                       cardData.number.startsWith('4242') ||
                       cardData.number.startsWith('5555');
    
    return {
      success: isTestCard,
      gateway: 'Braintree (Mock)',
      transactionId: `bt_mock_${Date.now()}`,
      status: isTestCard ? 'authorized' : 'processor_declined',
      amount: 1000,
      currency: 'USD',
      cardDetails: {
        brand: cardData.number.startsWith('4') ? 'Visa' : 
               cardData.number.startsWith('5') ? 'MasterCard' : 'Unknown',
        last4: last4,
        fingerprint: `bt_fp_${last4}`
      },
      processorResponse: {
        code: isTestCard ? '1000' : '2000',
        text: isTestCard ? 'Approved' : 'Do Not Honor'
      },
      mock: true
    };
  }
}

module.exports = BraintreeGateway;
