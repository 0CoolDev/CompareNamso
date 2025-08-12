// Test script for payment gateways
import fetch from 'node-fetch';

const testPayment = async () => {
  const testData = {
    cardNumber: '4242424242424242',
    exp_month: '12',
    exp_year: '25',
    cvc: '123',
    gateway: 'stripe',
    amount: 1000,
    holder_name: 'Test User'
  };

  try {
    const response = await fetch('http://localhost:5000/api/test-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Payment Test Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Test each gateway
const gateways = ['stripe', 'adyen', 'square', 'braintree'];

console.log('Testing Payment Gateways...\n');

for (const gateway of gateways) {
  console.log(`\nTesting ${gateway.toUpperCase()}:`);
  console.log('=' .repeat(40));
  
  await testPayment();
}
