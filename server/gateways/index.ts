const StripeGateway = require('./stripe');
const AdyenGateway = require('./adyen');
const SquareGateway = require('./square');
const BraintreeGateway = require('./braintree');

export const gateways = {
  stripe: new StripeGateway(),
  adyen: new AdyenGateway(),
  square: new SquareGateway(),
  braintree: new BraintreeGateway()
};

export {
  StripeGateway,
  AdyenGateway,
  SquareGateway,
  BraintreeGateway
};
