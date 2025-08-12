import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentTestResult {
  success: boolean;
  gateway: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  cardDetails?: {
    brand?: string;
    last4?: string;
    fingerprint?: string;
  };
  processorResponse?: {
    code?: string;
    text?: string;
  };
  error?: string;
  errorCode?: string;
  errorType?: string;
  declineCode?: string;
  mock?: boolean;
  timestamp?: string;
}

interface PaymentTesterProps {
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
}

export const PaymentTester: React.FC<PaymentTesterProps> = ({ 
  cardNumber = '', 
  expMonth = '', 
  expYear = '', 
  cvv = '' 
}) => {
  const [gateway, setGateway] = useState<string>('stripe');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<PaymentTestResult | null>(null);
  const [cardData, setCardData] = useState({
    cardNumber,
    exp_month: expMonth,
    exp_year: expYear,
    cvc: cvv,
    holder_name: 'Test User'
  });

  const handleTestPayment = async () => {
    if (!cardData.cardNumber || !cardData.exp_month || !cardData.exp_year || !cardData.cvc) {
      setTestResult({
        success: false,
        gateway,
        error: 'Please fill in all card details'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cardData,
          gateway,
          amount: 1000 // $10.00 in cents
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        gateway,
        error: 'Network error: ' + (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Gateway Tester
        </CardTitle>
        <CardDescription>
          Test card processing with different payment gateways
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="4242 4242 4242 4242"
              value={cardData.cardNumber}
              onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gateway">Payment Gateway</Label>
            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger id="gateway">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="adyen">Adyen</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="braintree">Braintree</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expMonth">Exp Month</Label>
            <Input
              id="expMonth"
              placeholder="12"
              maxLength={2}
              value={cardData.exp_month}
              onChange={(e) => setCardData({ ...cardData, exp_month: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expYear">Exp Year</Label>
            <Input
              id="expYear"
              placeholder="25"
              maxLength={4}
              value={cardData.exp_year}
              onChange={(e) => setCardData({ ...cardData, exp_year: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input
              id="cvc"
              placeholder="123"
              maxLength={4}
              value={cardData.cvc}
              onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="holderName">Cardholder Name</Label>
          <Input
            id="holderName"
            placeholder="John Doe"
            value={cardData.holder_name}
            onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value })}
          />
        </div>

        <Button 
          onClick={handleTestPayment} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Test Payment
            </>
          )}
        </Button>

        {testResult && (
          <div className="mt-4 space-y-3">
            <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <AlertDescription className="font-semibold">
                    {testResult.success ? 'Payment Successful' : 'Payment Failed'}
                  </AlertDescription>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Gateway:</span>
                      <Badge variant="outline">{testResult.gateway}</Badge>
                      {testResult.mock && <Badge variant="secondary">Mock Mode</Badge>}
                    </div>
                    
                    {testResult.transactionId && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {testResult.transactionId}
                        </code>
                      </div>
                    )}
                    
                    {testResult.status && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={testResult.success ? 'default' : 'destructive'}>
                          {testResult.status}
                        </Badge>
                      </div>
                    )}
                    
                    {testResult.cardDetails && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Card:</span>
                        <span className="text-sm">
                          {testResult.cardDetails.brand} •••• {testResult.cardDetails.last4}
                        </span>
                      </div>
                    )}
                    
                    {testResult.processorResponse && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Response:</span>
                        <span className="text-sm">
                          [{testResult.processorResponse.code}] {testResult.processorResponse.text}
                        </span>
                      </div>
                    )}
                    
                    {testResult.error && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground">Error:</span>
                        <span className="text-sm text-red-600">{testResult.error}</span>
                      </div>
                    )}
                    
                    {testResult.declineCode && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Decline Code:</span>
                        <Badge variant="destructive">{testResult.declineCode}</Badge>
                      </div>
                    )}
                    
                    {testResult.amount && testResult.currency && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="text-sm">
                          {(testResult.amount / 100).toFixed(2)} {testResult.currency.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentTester;
