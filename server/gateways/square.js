const { Client, Environment } = require('square');

class SquareGateway {
  constructor() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = process.env.SQUARE_ENVIRONMENT === 'sandbox' ? 
      Environment.Sandbox : Environment.Production;
    
    if (accessToken && accessToken !== 'mock') {
      this.client = new Client({
        accessToken,
        environment
      });
      this.isMock = false;
    } else {
      this.isMock = true;
    }
  }

  async processPayment(cardData, amount = 1000) {
    if (this.isMock) {
      return this.mockPayment(cardData);
    }

    try {
      // Create a card
      const { result: cardResult } = await this.client.cardsApi.createCard({
        idempotencyKey: `${Date.now()}_${Math.random()}`,
        sourceId: 'cnon:card-nonce-ok', // Test nonce for sandbox
        card: {
          cardholderName: cardData.holder_name || 'Test User',
          billingAddress: {
            postalCode: cardData.postal_code || '94103'
          }
        }
      });

      // Create a payment
      const { result: paymentResult } = await this.client.paymentsApi.createPayment({
        sourceId: cardResult.card.id,
        idempotencyKey: `payment_${Date.now()}_${Math.random()}`,
        amountMoney: {
          amount: BigInt(amount),
          currency: 'USD'
        },
        autocomplete: true
      });

      return {
        success: paymentResult.payment.status === 'COMPLETED',
        gateway: 'Square',
        transactionId: paymentResult.payment.id,
        status: paymentResult.payment.status,
        amount: Number(paymentResult.payment.amountMoney.amount),
        currency: paymentResult.payment.amountMoney.currency,
        cardDetails: {
          brand: paymentResult.payment.cardDetails?.card?.cardBrand,
          last4: paymentResult.payment.cardDetails?.card?.last4,
          fingerprint: paymentResult.payment.cardDetails?.card?.fingerprint
        },
        raw: paymentResult
      };
    } catch (error) {
      return {
        success: false,
        gateway: 'Square',
        error: error.message,
        errors: error.errors,
        code: error.code
      };
    }
  }

  mockPayment(cardData) {
    const last4 = cardData.number.slice(-4);
    const isTestCard = cardData.number.startsWith('4111') || cardData.number.startsWith('4242');
    
    return {
      success: isTestCard,
      gateway: 'Square (Mock)',
      transactionId: `sq_mock_${Date.now()}`,
      status: isTestCard ? 'COMPLETED' : 'FAILED',
      amount: 1000,
      currency: 'USD',
      cardDetails: {
        brand: cardData.number.startsWith('4') ? 'VISA' : 'MASTERCARD',
        last4: last4,
        fingerprint: `sq_fp_${last4}`
      },
      mock: true
    };
  }
}

module.exports = SquareGateway;
