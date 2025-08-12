// Payment Gateway Testing Route
const { gateways } = require('./gateways');

const paymentTestRoute = (app) => {
  app.post(
    "/api/test-payment",
    async (req, res) => {
      try {
        const { 
          cardNumber, 
          exp_month, 
          exp_year, 
          cvc, 
          gateway = 'stripe',
          amount = 1000,
          holder_name 
        } = req.body;

        // Validate input
        if (!cardNumber || !exp_month || !exp_year || !cvc) {
          return res.status(400).json({
            success: false,
            error: 'Missing required card information'
          });
        }

        // Validate gateway
        const validGateways = ['stripe', 'adyen', 'square', 'braintree'];
        if (!validGateways.includes(gateway.toLowerCase())) {
          return res.status(400).json({
            success: false,
            error: `Invalid gateway. Must be one of: ${validGateways.join(', ')}`
          });
        }

        // Format card data
        const cardData = {
          number: cardNumber.replace(/\s+/g, ''),
          exp_month: exp_month.toString().padStart(2, '0'),
          exp_year: exp_year.toString().length === 2 ? '20' + exp_year : exp_year.toString(),
          cvc: cvc.toString(),
          holder_name: holder_name || 'Test User'
        };

        // Process payment with selected gateway
        const gatewayInstance = gateways[gateway.toLowerCase()];
        if (!gatewayInstance) {
          return res.status(500).json({
            success: false,
            error: 'Gateway not properly configured'
          });
        }

        const result = await gatewayInstance.processPayment(cardData, amount);
        
        // Format response
        const response = {
          success: result.success,
          gateway: result.gateway,
          transactionId: result.transactionId,
          status: result.status,
          amount: result.amount,
          currency: result.currency,
          cardDetails: result.cardDetails || {
            brand: result.brand,
            last4: result.last4,
            fingerprint: result.fingerprint
          },
          processorResponse: result.processorResponse,
          error: result.error,
          errorCode: result.code || result.errorCode,
          errorType: result.type || result.errorType,
          declineCode: result.decline_code || result.refusalReason,
          mock: result.mock || false,
          timestamp: new Date().toISOString()
        };

        res.json(response);
      } catch (error) {
        console.error('Payment test error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error',
          gateway: req.body.gateway || 'unknown'
        });
      }
    }
  );
};

module.exports = { paymentTestRoute };
