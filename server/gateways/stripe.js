const Stripe = require('stripe');

class StripeGateway {
  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey && apiKey !== 'mock') {
      this.stripe = new Stripe(apiKey);
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
      // Create a payment method
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardData.number,
          exp_month: parseInt(cardData.exp_month),
          exp_year: parseInt(cardData.exp_year),
          cvc: cardData.cvc,
        },
      });

      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method: paymentMethod.id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      });

      return {
        success: paymentIntent.status === 'succeeded',
        gateway: 'Stripe',
        transactionId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        fingerprint: paymentMethod.card?.fingerprint,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        raw: paymentIntent
      };
    } catch (error) {
      return {
        success: false,
        gateway: 'Stripe',
        error: error.message,
        code: error.code,
        type: error.type,
        decline_code: error.decline_code
      };
    }
  }

  mockPayment(cardData) {
    const last4 = cardData.number.slice(-4);
    const isTestCard = cardData.number.startsWith('4242');
    
    return {
      success: isTestCard,
      gateway: 'Stripe (Mock)',
      transactionId: `pi_mock_${Date.now()}`,
      status: isTestCard ? 'succeeded' : 'failed',
      amount: 1000,
      currency: 'usd',
      fingerprint: `mock_fp_${last4}`,
      brand: cardData.number.startsWith('4') ? 'visa' : 'mastercard',
      last4: last4,
      mock: true
    };
  }
}

module.exports = StripeGateway;
