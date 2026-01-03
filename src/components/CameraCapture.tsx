import { useState, useRef } from "react";
import { Camera, Upload, Scan, Plus, ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { detectFoodItemsFromDataUrl } from "@/lib/vision/detectFood";
import { GroceryCategory, ShoppingItem } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";

type CaptureMode = "pantry" | "cart";

interface CameraCaptureProps {
  onItemsDetected: (items: string[]) => void;
  onAddToShoppingList: (item: string, quantity?: number, category?: GroceryCategory) => void | Promise<void>;
  shoppingList?: ShoppingItem[];
  onMarkAsBought?: (id: string) => void | Promise<void>;
}

const CameraCapture = ({ onItemsDetected, onAddToShoppingList, shoppingList = [], onMarkAsBought }: CameraCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("pantry");
  const [cartComparison, setCartComparison] = useState<{
    inCart: string[];
    missing: ShoppingItem[];
    matched: ShoppingItem[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // AI analysis function using Hugging Face Transformers (on-device)
  const analyzeImage = async (imageData: string): Promise<string[]> => {
    setIsAnalyzing(true);
    
    try {
      console.log('Starting on-device image analysis...');
      const detectedItems = await detectFoodItemsFromDataUrl(imageData);
      console.log('Detected items:', detectedItems);
      
      setIsAnalyzing(false);
      return detectedItems;
    } catch (error) {
      console.error('Image analysis failed:', error);
      setIsAnalyzing(false);
      throw error;
    }
  };

  // Compare cart items with shopping list
  const compareWithShoppingList = (cartItems: string[]) => {
    const cartLower = cartItems.map(item => item.toLowerCase());
    
    // Find which shopping list items are in the cart
    const matched: ShoppingItem[] = [];
    const missing: ShoppingItem[] = [];
    
    // Only compare unbought items
    const unboughtItems = shoppingList.filter(item => !item.bought);
    
    unboughtItems.forEach(shopItem => {
      const shopNameLower = shopItem.name.toLowerCase();
      const isInCart = cartLower.some(cartItem => 
        cartItem.includes(shopNameLower) || 
        shopNameLower.includes(cartItem) ||
        // Fuzzy match for similar terms
        cartItem.split(' ').some(word => shopNameLower.includes(word) && word.length > 3) ||
        shopNameLower.split(' ').some(word => cartItem.includes(word) && word.length > 3)
      );
      
      if (isInCart) {
        matched.push(shopItem);
      } else {
        missing.push(shopItem);
      }
    });

    return { inCart: cartItems, matched, missing };
  };

  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setCartComparison(null);
    
    try {
      const items = await analyzeImage(imageData);
      setDetectedItems(items);
      
      if (captureMode === "pantry") {
        onItemsDetected(items);
        toast({
          title: "Analysis Complete!",
          description: `Detected ${items.length} items in your photo.`,
        });
      } else {
        // Cart mode - compare with shopping list
        const comparison = compareWithShoppingList(items);
        setCartComparison(comparison);
        
        const matchCount = comparison.matched.length;
        const missingCount = comparison.missing.length;
        
        toast({
          title: "Cart Analyzed!",
          description: missingCount === 0 
            ? `All ${matchCount} items found! You're good to go.`
            : `Found ${matchCount} items. ${missingCount} still missing.`,
          variant: missingCount === 0 ? "default" : "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        handleImageCapture(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setIsCapturing(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        // @ts-ignore
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play().catch(() => {});
      }
    } catch (error) {
      setIsCameraOpen(false);
      toast({
        title: "Camera Access Failed",
        description: "Could not access camera. Please try uploading an image instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    if (videoRef.current) {
      // @ts-ignore
      videoRef.current.srcObject = null;
    }
    streamRef.current = null;
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, vw, vh);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setIsCameraOpen(false);
    setIsCapturing(false);
    handleImageCapture(imageData);
  };

  const handleMarkAllMatched = async () => {
    if (!cartComparison || !onMarkAsBought) return;
    
    for (const item of cartComparison.matched) {
      await onMarkAsBought(item.id);
    }
    
    toast({
      title: "Items Checked Off!",
      description: `${cartComparison.matched.length} items marked as bought.`,
    });
    
    setCartComparison(null);
    setDetectedItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button
          onClick={() => {
            setCaptureMode("pantry");
            setCartComparison(null);
            setDetectedItems([]);
          }}
          variant={captureMode === "pantry" ? "default" : "ghost"}
          className="flex-1"
        >
          <Scan className="h-4 w-4 mr-2" />
          Scan Pantry
        </Button>
        <Button
          onClick={() => {
            setCaptureMode("cart");
            setCartComparison(null);
            setDetectedItems([]);
          }}
          variant={captureMode === "cart" ? "default" : "ghost"}
          className="flex-1"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Check Cart
        </Button>
      </div>

      {/* Mode Description */}
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <p className="text-sm text-muted-foreground">
            {captureMode === "pantry" 
              ? "Take a photo of your pantry to detect and add items to inventory."
              : "Take a photo of your shopping cart to see what's missing from your list."}
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={startCamera}
          disabled={isCapturing || isAnalyzing}
          variant="fresh"
          size="lg"
          className="h-16"
        >
          <Camera className="h-6 w-6 mr-2" />
          {isCapturing ? "Capturing..." : "Take Photo"}
        </Button>
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          variant="warm"
          size="lg"
          className="h-16"
        >
          <Upload className="h-6 w-6 mr-2" />
          Upload Image
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {isCameraOpen && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-medium">Camera Preview</h3>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded-lg shadow-soft bg-muted"
              />
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={capturePhoto}
                  variant="fresh"
                  size="lg"
                  disabled={isCapturing || isAnalyzing}
                >
                  <Camera className="h-6 w-6 mr-2" />
                  {isCapturing ? "Capturing..." : "Capture"}
                </Button>
                <Button
                  onClick={() => { stopCamera(); setIsCameraOpen(false); }}
                  variant="secondary"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Status */}
      {isAnalyzing && (
        <Card className="border-primary shadow-glow">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <Scan className="h-8 w-8 text-primary mx-auto animate-pulse" />
              <p className="text-lg font-medium">Analyzing your photo...</p>
              <p className="text-muted-foreground">
                {captureMode === "pantry" 
                  ? "AI is detecting items in your pantry"
                  : "AI is checking your cart against your shopping list"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cart Comparison Results */}
      {captureMode === "cart" && cartComparison && !isAnalyzing && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className={cartComparison.missing.length === 0 ? "border-green-500" : "border-orange-500"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {cartComparison.missing.length === 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                )}
                <div>
                  <h3 className="font-semibold">
                    {cartComparison.missing.length === 0 
                      ? "All items found!" 
                      : `${cartComparison.missing.length} items still missing`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {cartComparison.matched.length} of {cartComparison.matched.length + cartComparison.missing.length} shopping list items in cart
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Items */}
          {cartComparison.missing.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Still Need to Get
                </h3>
                <div className="space-y-2">
                  {cartComparison.missing.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <span className="text-sm font-medium">{item.name}</span>
                      <Badge variant="outline" className="text-orange-600">
                        {item.quantity}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Found Items */}
          {cartComparison.matched.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Found in Cart
                  </h3>
                  {onMarkAsBought && (
                    <Button size="sm" variant="outline" onClick={handleMarkAllMatched}>
                      Check All Off
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {cartComparison.matched.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <span className="text-sm font-medium">{item.name}</span>
                      <Badge variant="outline" className="text-green-600">
                        ✓
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detected Items in Cart */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 text-muted-foreground">All Items Detected in Cart</h3>
              <div className="flex flex-wrap gap-2">
                {cartComparison.inCart.map((item, index) => (
                  <Badge key={index} variant="secondary">{item}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detected Items (Pantry Mode) */}
      {captureMode === "pantry" && detectedItems.length > 0 && !isAnalyzing && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-medium">Detected Items</h3>
              <div className="space-y-2">
                {detectedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm font-medium">{item}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onAddToShoppingList(item);
                        toast({
                          title: "Added to Shopping List",
                          description: `${item} has been added to your shopping list.`,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {capturedImage && !isAnalyzing && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-medium">Last Captured Image</h3>
              <img
                src={capturedImage}
                alt="Captured photo for AI item detection"
                loading="lazy"
                className="w-full max-w-md mx-auto rounded-lg shadow-soft"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Tips for better results:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure good lighting</li>
              <li>• Keep items clearly visible</li>
              <li>• Avoid blurry photos</li>
              <li>• Include product labels when possible</li>
              {captureMode === "cart" && (
                <li>• Spread items out in your cart for better detection</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;