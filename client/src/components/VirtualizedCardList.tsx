import React, { useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CardWithMeta } from '@shared/schema';

interface VirtualizedCardListProps {
  cards: CardWithMeta[];
  height?: number;
  itemHeight?: number;
}

interface CardRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    cards: CardWithMeta[];
    onCopy: (text: string) => void;
  };
}

// Memoized card row component
const CardRow = memo(({ index, style, data }: CardRowProps) => {
  const card = data.cards[index];
  
  const getBrandIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '🔴';
      case 'american express': return '🔵';
      case 'discover': return '🟠';
      case 'diners club': return '⚪';
      case 'jcb': return '🟢';
      case 'unionpay': return '🔵';
      case 'maestro': return '🔴';
      default: return '💳';
    }
  };

  const handleCopy = () => {
    const text = `${card.cardNumber}|${card.month}|${card.year}|${card.ccv}`;
    data.onCopy(text);
  };

  return (
    <div style={style} className="px-2">
      <div className="flex items-center justify-between bg-white p-3 rounded border hover:bg-gray-50 group">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-lg">{getBrandIcon(card.brand || '')}</span>
          <span className="text-gray-800">
            {card.cardNumber}|{card.month}|{card.year}|{card.ccv}
          </span>
          {card.isLuhnValid && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {!card.isLuhnValid && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid={`button-copy-${index}`}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});

CardRow.displayName = 'CardRow';

export const VirtualizedCardList: React.FC<VirtualizedCardListProps> = ({
  cards,
  height = 400,
  itemHeight = 56
}) => {
  const { toast } = useToast();

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Card details copied to clipboard"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast]);

  const itemData = {
    cards,
    onCopy: copyToClipboard
  };

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No cards generated yet
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <List
        height={height}
        itemCount={cards.length}
        itemSize={itemHeight}
        width="100%"
        itemData={itemData}
      >
        {CardRow}
      </List>
    </div>
  );
};

export default VirtualizedCardList;
