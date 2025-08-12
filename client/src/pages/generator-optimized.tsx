import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { binCache, cardCache } from "@/lib/cache";
import { generateCardSchema, type GenerateCardRequest, type CardResult, type BinInfo } from "@shared/schema";
import { Copy, CreditCard, CheckCircle, AlertCircle, ChevronDown, List } from "lucide-react";
import { sanitizeBin, sanitizeUserInput, sanitizeText } from "@/lib/sanitize";
import VirtualizedCardList from "@/components/VirtualizedCardList";
import PaymentTester from "@/components/PaymentTester";

export default function GeneratorOptimized() {
  const [generatedCards, setGeneratedCards] = useState<string[]>([]);
  const [cardResults, setCardResults] = useState<CardResult | null>(null);
  const [binInfo, setBinInfo] = useState<BinInfo | null>(null);
  const [currentBin, setCurrentBin] = useState("");
  const [bulkBins, setBulkBins] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<GenerateCardRequest>({
    resolver: zodResolver(generateCardSchema.extend({
      bin: generateCardSchema.shape.bin,
      month: generateCardSchema.shape.month,
      year: generateCardSchema.shape.year,
      ccv2: generateCardSchema.shape.ccv2,
      quantity: generateCardSchema.shape.quantity,
      seed: generateCardSchema.shape.seed
    })),
    defaultValues: {
      bin: "",
      month: "random",
      year: "random", 
      ccv2: "",
      quantity: 10,
      seed: undefined
    }
  });

  // BIN lookup query with caching
  const { data: binLookupData } = useQuery({
    queryKey: ['/api/bin-lookup', currentBin],
    queryFn: async () => {
      if (!currentBin || currentBin.length < 6) return null;
      
      // Check cache first
      const cacheKey = `bin_${currentBin}`;
      const cached = binCache.get<BinInfo>(cacheKey);
      if (cached) {
        console.log('BIN cache hit:', currentBin);
        return cached;
      }
      
      // Fetch from server
      const response = await fetch(`/api/bin-lookup/${currentBin}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Store in cache
      binCache.set(cacheKey, data);
      
      return data;
    },
    enabled: currentBin.length >= 6,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 24 * 60 * 60 * 1000
  });

  // Update BIN info when lookup data changes
  useEffect(() => {
    if (binLookupData) {
      setBinInfo(binLookupData);
    }
  }, [binLookupData]);

  const generateCardsMutation = useMutation({
    mutationFn: async (data: GenerateCardRequest): Promise<CardResult> => {
      // Check cache for previously generated cards with same parameters
      const cacheKey = `cards_${data.bin}_${data.quantity}_${data.month}_${data.year}_${data.ccv2}_${data.seed}`;
      const cached = cardCache.get<CardResult>(cacheKey);
      if (cached) {
        console.log('Card cache hit');
        return cached;
      }
      
      const response = await apiRequest("POST", "/api/generate-cards", data);
      const result = await response.json();
      
      // Store in cache
      cardCache.set(cacheKey, result);
      
      return result;
    },
    onSuccess: (result) => {
      setGeneratedCards(result.cards);
      setCardResults(result);
      setBinInfo(result.binInfo || null);
      toast({
        title: "Success",
        description: `Generated ${result.cards.length} card(s) successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate cards",
        variant: "destructive"
      });
    }
  });

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Copied to clipboard"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const copyAllCards = () => {
    copyToClipboard(generatedCards.join('\n'));
  };

  const processBulkBins = async (binText: string) => {
    const bins = binText.split('\n').map(bin => bin.trim()).filter(bin => bin && /^\d{6,16}$/.test(bin));
    
    if (bins.length === 0) {
      toast({
        title: "Error",
        description: "No valid BINs found in the input",
        variant: "destructive"
      });
      return;
    }

    let allResults: string[] = [];
    let allCardsWithMeta: any[] = [];
    
    for (const bin of bins) {
      try {
        const formData = { ...form.getValues(), bin };
        const result = await generateCardsMutation.mutateAsync(formData);
        allResults = [...allResults, ...result.cards];
        if (result.cardsWithMeta) {
          allCardsWithMeta = [...allCardsWithMeta, ...result.cardsWithMeta];
        }
      } catch (error) {
        console.error(`Error processing BIN ${bin}:`, error);
      }
    }
    
    if (allResults.length > 0) {
      setGeneratedCards(allResults);
      if (allCardsWithMeta.length > 0) {
        setCardResults(prev => ({
          ...prev!,
          cards: allResults,
          cardsWithMeta: allCardsWithMeta
        }));
      }
    }
  };

  const handleBulkProcess = () => {
    if (!bulkBins.trim()) {
      toast({
        title: "Error",
        description: "Please enter BINs to process",
        variant: "destructive"
      });
      return;
    }
    processBulkBins(bulkBins);
  };

  const onSubmit = (data: GenerateCardRequest) => {
    generateCardsMutation.mutate(data);
  };

  // Memoize card list height based on window size
  const listHeight = useMemo(() => {
    if (typeof window !== 'undefined') {
      const vh = window.innerHeight;
      return Math.min(600, Math.max(400, vh - 500));
    }
    return 400;
  }, []);

  return (
    <div className="min-h-screen bg-gray-800 text-white font-sans flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 py-5 text-center text-2xl font-bold">
        Namso GEN | NullMe (Optimized)
      </div>

      {/* Cache Status Badge */}
      <div className="flex justify-center p-2">
        <Badge variant="secondary" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Performance Optimized: Lazy Loading + Caching + Virtual Scrolling
        </Badge>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Form Section */}
          <div className="bg-gray-700 p-8 rounded-lg">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* BIN Input */}
                <FormField
                  control={form.control}
                  name="bin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-600 font-bold text-sm">BIN</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter BIN"
                          className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          data-testid="input-bin"
                          onChange={(e) => {
                            const value = sanitizeBin(e.target.value);
                            field.onChange(value);
                            setCurrentBin(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* BIN Information Display */}
                {binInfo && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-purple-700">
                        BIN Information
                        {binCache.has(`bin_${currentBin}`) && (
                          <Badge variant="outline" className="ml-2 text-xs">Cached</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Brand:</span>
                        <Badge variant="secondary">{sanitizeText(binInfo.brand)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Type:</span>
                        <span className="text-xs font-medium">{sanitizeText(binInfo.type)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Level:</span>
                        <span className="text-xs font-medium">{sanitizeText(binInfo.level)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Bank:</span>
                        <span className="text-xs font-medium">{sanitizeText(binInfo.bank)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Country:</span>
                        <span className="text-xs font-medium">{sanitizeText(binInfo.country)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Randomization Seed */}
                <FormField
                  control={form.control}
                  name="seed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-600 font-bold text-sm">Randomization Seed (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder="Leave blank for random seed"
                          className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          data-testid="input-seed"
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            field.onChange(value);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="block text-purple-600 font-bold text-sm">Date</label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger 
                                className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                data-testid="select-month"
                              >
                                <SelectValue placeholder="Random" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="random">Random</SelectItem>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                                  {month.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger 
                                className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                data-testid="select-year"
                              >
                                <SelectValue placeholder="Random" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="random">Random</SelectItem>
                              {Array.from({ length: 7 }, (_, i) => 2024 + i).map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* CCV2 and Quantity Row */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="ccv2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-600 font-bold text-sm">CCV2</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Leave blank to randomize"
                              className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                              data-testid="input-ccv2"
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-purple-600 font-bold text-sm">Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="w-full p-3 border-0 rounded bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                            data-testid="input-quantity"
                            min={1}
                            max={1000}
                            onChange={(e) => {
                              let value = parseInt(e.target.value);
                              if (value < 1) value = 1;
                              if (value > 1000) value = 1000;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Generate Button */}
                <Button
                  type="submit"
                  disabled={generateCardsMutation.isPending}
                  className="w-full py-4 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-800 hover:to-purple-600 border-0 rounded text-white text-lg font-bold cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  data-testid="button-generate"
                >
                  {generateCardsMutation.isPending ? "Generating..." : "Generate Cards"}
                </Button>
              </form>
            </Form>

            {/* Advanced Features */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full mt-4 text-purple-600 hover:bg-purple-50"
                  data-testid="button-advanced"
                >
                  <List className="w-4 h-4 mr-2" />
                  Bulk BIN Processing
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <Card className="bg-gray-600 border-gray-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Bulk BIN Processing</CardTitle>
                    <CardDescription className="text-gray-300 text-xs">
                      Enter multiple BINs (one per line) to generate cards for each BIN
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Enter BINs (one per line)&#10;420769&#10;420770&#10;420771"
                        value={bulkBins}
                        onChange={(e) => setBulkBins(e.target.value)}
                        className="w-full h-24 bg-white border-0 rounded p-3 text-black text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
                        data-testid="textarea-bulk-bins"
                      />
                      <Button
                        onClick={handleBulkProcess}
                        disabled={generateCardsMutation.isPending}
                        className="w-full py-2 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-800 hover:to-purple-600 border-0 rounded text-white text-sm font-bold cursor-pointer transition-all duration-300"
                        data-testid="button-bulk-process"
                      >
                        {generateCardsMutation.isPending ? "Processing..." : "Process Bulk BINs"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Result Section with Virtualized List */}
          <div className="bg-gray-100 rounded-lg min-h-80 p-0">
            <div className="p-8">
              <div className="flex justify-between items-center mb-4">
                <div className="text-purple-600 font-bold text-sm">
                  Result ({cardResults?.cardsWithMeta?.length || 0} cards)
                </div>
                <div className="flex gap-2">
                  {cardResults?.isLuhnApproved && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Luhn Approved
                    </Badge>
                  )}
                  {generatedCards.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyAllCards}
                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      data-testid="button-copy-all"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy All
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Virtualized Card List */}
              {cardResults?.cardsWithMeta && cardResults.cardsWithMeta.length > 0 ? (
                <VirtualizedCardList 
                  cards={cardResults.cardsWithMeta}
                  height={listHeight}
                />
              ) : (
                <Textarea
                  value={generatedCards.join('\n')}
                  readOnly
                  placeholder="Generated card numbers will appear here..."
                  className="w-full h-64 bg-white border-0 rounded p-4 text-black font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
                  data-testid="textarea-results"
                />
              )}            </div>
            
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

      {/* Footer */}
      <div className="text-center py-5 text-gray-400 text-xs mt-auto">
        💀💀 2024 NullMe Namso Generator | Optimized Version | For Testing and Developmental Purposes Only💀<br />
        Performance: Lazy Loading + LocalStorage Caching + Virtual Scrolling<br />
        <a href="#" className="text-purple-600 no-underline hover:text-purple-700">NullMe</a>
      </div>
    </div>
  );
}
