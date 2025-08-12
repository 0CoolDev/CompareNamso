import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateCardSchema, type GenerateCardRequest, type CardResult } from "@shared/schema";

export default function Generator() {
  const [generatedCards, setGeneratedCards] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<GenerateCardRequest>({
    resolver: zodResolver(generateCardSchema.extend({
      bin: generateCardSchema.shape.bin,
      month: generateCardSchema.shape.month,
      year: generateCardSchema.shape.year,
      ccv2: generateCardSchema.shape.ccv2,
      quantity: generateCardSchema.shape.quantity
    })),
    defaultValues: {
      bin: "",
      month: "random",
      year: "random", 
      ccv2: "",
      quantity: 10
    }
  });

  const generateCardsMutation = useMutation({
    mutationFn: async (data: GenerateCardRequest): Promise<CardResult> => {
      const response = await apiRequest("POST", "/api/generate-cards", data);
      return response.json();
    },
    onSuccess: (result) => {
      setGeneratedCards(result.cards);
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

  const onSubmit = (data: GenerateCardRequest) => {
    generateCardsMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white font-sans flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 py-5 text-center text-2xl font-bold">
        Namso GEN | NullMe
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
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
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
                              <SelectItem value="01">01</SelectItem>
                              <SelectItem value="02">02</SelectItem>
                              <SelectItem value="03">03</SelectItem>
                              <SelectItem value="04">04</SelectItem>
                              <SelectItem value="05">05</SelectItem>
                              <SelectItem value="06">06</SelectItem>
                              <SelectItem value="07">07</SelectItem>
                              <SelectItem value="08">08</SelectItem>
                              <SelectItem value="09">09</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="11">11</SelectItem>
                              <SelectItem value="12">12</SelectItem>
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
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                              <SelectItem value="2027">2027</SelectItem>
                              <SelectItem value="2028">2028</SelectItem>
                              <SelectItem value="2029">2029</SelectItem>
                              <SelectItem value="2030">2030</SelectItem>
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
                            max={100}
                            onChange={(e) => {
                              let value = parseInt(e.target.value);
                              if (value < 1) value = 1;
                              if (value > 100) value = 100;
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
          </div>

          {/* Result Section */}
          <div className="bg-gray-100 rounded-lg min-h-80 p-0">
            <div className="p-8">
              <div className="text-purple-600 font-bold mb-4 text-sm">Result</div>
              <Textarea
                value={generatedCards.join('\n')}
                readOnly
                placeholder="Generated card numbers will appear here..."
                className="w-full h-64 bg-white border-0 rounded p-4 text-black font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
                data-testid="textarea-results"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-5 text-gray-400 text-xs mt-auto">
        💀💀 2024 NullMe Namso Generator|For Testing and Developmental Purposes Only💀<br />
        Find Me On TG Below<br />
        <a href="#" className="text-purple-600 no-underline hover:text-purple-700">NullMe</a>
      </div>
    </div>
  );
}
