import { useState, useRef } from "react";
import { Camera, Upload, Scan, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { detectFoodItemsFromDataUrl } from "@/lib/vision/detectFood";
interface CameraCaptureProps {
  onItemsDetected: (items: string[]) => void;
  onAddToShoppingList: (item: string) => void;
}

const CameraCapture = ({ onItemsDetected, onAddToShoppingList }: CameraCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
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
  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    
    try {
      const items = await analyzeImage(imageData);
      setDetectedItems(items);
      onItemsDetected(items);
      
      toast({
        title: "Analysis Complete!",
        description: `Detected ${items.length} items in your photo.`,
      });
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

  return (
    <div className="space-y-6">
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
              <p className="text-muted-foreground">AI is detecting items in your pantry</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Items */}
      {detectedItems.length > 0 && !isAnalyzing && (
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
                alt="Captured pantry photo for AI item detection"
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
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;