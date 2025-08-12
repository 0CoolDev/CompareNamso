const StripeGateway = require('./stripe');
const AdyenGateway = require('./adyen');
const SquareGateway = require('./square');
const BraintreeGateway = require('./braintree');

const gateways = {
  stripe: new StripeGateway(),
  adyen: new AdyenGateway(),
  square: new SquareGateway(),
  braintree: new BraintreeGateway()
};

module.exports = {
  gateways,
  StripeGateway,
  AdyenGateway,
  SquareGateway,
  BraintreeGateway
};
