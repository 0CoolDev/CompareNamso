import re

# Read the file
with open('client/src/pages/generator-optimized.tsx', 'r') as f:
    content = f.read()

# Find the closing tag after the textarea/VirtualizedCardList section
pattern = r'(\s*</div>\s*</div>\s*</div>\s*</div>\s*{/\* Footer \*/})'

replacement = r'''            </div>
            
            {/* Payment Gateway Tester */}
            {cardResults?.cardsWithMeta && cardResults.cardsWithMeta.length > 0 && (
              <div className="mt-6">
                <PaymentTester 
                  cardNumber={cardResults.cardsWithMeta[0].cardNumber}
                  expMonth={cardResults.cardsWithMeta[0].month}
                  expYear={cardResults.cardsWithMeta[0].year}
                  cvv={cardResults.cardsWithMeta[0].ccv}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}'''

# Replace the pattern
content = re.sub(pattern, replacement, content, count=1)

# Write back
with open('client/src/pages/generator-optimized.tsx', 'w') as f:
    f.write(content)

print("PaymentTester component added successfully")
