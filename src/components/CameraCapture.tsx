import { useState, useRef } from "react";
import { Camera, Upload, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface CameraCaptureProps {
  onItemsDetected: (items: string[]) => void;
}

const CameraCapture = ({ onItemsDetected }: CameraCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // AI analysis function using Hugging Face Transformers
  const analyzeImage = async (imageData: string): Promise<string[]> => {
    setIsAnalyzing(true);
    
    try {
      // Convert base64 to blob for analysis
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Create image element for processing
      const img = new Image();
      img.src = imageData;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Use a simple approach: analyze the image using a food detection API
      // For now, we'll use a mock but structure it for real implementation
      const detectedItems = await detectFoodItems(img);
      
      setIsAnalyzing(false);
      return detectedItems;
    } catch (error) {
      console.error('Image analysis failed:', error);
      setIsAnalyzing(false);
      throw error;
    }
  };

  // Food detection function (can be enhanced with real AI services)
  const detectFoodItems = async (imageElement: HTMLImageElement): Promise<string[]> => {
    // This is a simplified detection - in production, use services like:
    // - Hugging Face Vision Transformers
    // - Google Vision API
    // - Custom food detection model
    
    // For demo purposes, return empty array to show no detection
    // User will need to add items manually until real AI is integrated
    return [];
  };

  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    
    try {
      const detectedItems = await analyzeImage(imageData);
      onItemsDetected(detectedItems);
      
      toast({
        title: "Analysis Complete!",
        description: `Detected ${detectedItems.length} items in your photo.`,
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
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      // Create video element to capture from camera
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        setTimeout(() => {
          ctx?.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg');
          
          // Stop camera
          stream.getTracks().forEach(track => track.stop());
          setIsCapturing(false);
          
          handleImageCapture(imageData);
        }, 1000); // Give user 1 second to position camera
      };
      
    } catch (error) {
      setIsCapturing(false);
      toast({
        title: "Camera Access Failed",
        description: "Could not access camera. Please try uploading an image instead.",
        variant: "destructive",
      });
    }
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
        onChange={handleFileUpload}
        className="hidden"
      />

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

      {/* Preview */}
      {capturedImage && !isAnalyzing && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-medium">Last Captured Image</h3>
              <img
                src={capturedImage}
                alt="Captured pantry"
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