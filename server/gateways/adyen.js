const { Client, Config, CheckoutAPI } = require('@adyen/api-library');

class AdyenGateway {
  constructor() {
    const apiKey = process.env.ADYEN_API_KEY;
    const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    
    if (apiKey && apiKey !== 'mock' && merchantAccount) {
      const config = new Config();
      config.apiKey = apiKey;
      config.environment = 'TEST';
      
      this.client = new Client({ config });
      this.checkout = new CheckoutAPI(this.client);
      this.merchantAccount = merchantAccount;
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
      const paymentRequest = {
        amount: {
          currency: 'USD',
          value: amount
        },
        reference: `test_${Date.now()}`,
        merchantAccount: this.merchantAccount,
        paymentMethod: {
          type: 'card',
          number: cardData.number,
          expiryMonth: cardData.exp_month,
          expiryYear: cardData.exp_year,
          cvc: cardData.cvc,
          holderName: cardData.holder_name || 'Test User'
        }
      };

      const response = await this.checkout.PaymentsApi.payments(paymentRequest);

      return {
        success: response.resultCode === 'Authorised',
        gateway: 'Adyen',
        transactionId: response.pspReference,
        status: response.resultCode,
        amount: response.amount?.value,
        currency: response.amount?.currency,
        refusalReason: response.refusalReason,
        raw: response
      };
    } catch (error) {
      return {
        success: false,
        gateway: 'Adyen',
        error: error.message,
        code: error.errorCode,
        type: error.errorType
      };
    }
  }

  mockPayment(cardData) {
    const last4 = cardData.number.slice(-4);
    const isTestCard = cardData.number.startsWith('4111');
    
    return {
      success: isTestCard,
      gateway: 'Adyen (Mock)',
      transactionId: `mock_${Date.now()}_ABCD1234`,
      status: isTestCard ? 'Authorised' : 'Refused',
      amount: 1000,
      currency: 'USD',
      refusalReason: isTestCard ? null : 'INVALID_CARD',
      last4: last4,
      mock: true
    };
  }
}

module.exports = AdyenGateway;
