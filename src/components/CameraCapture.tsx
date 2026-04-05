import { useState, useRef } from "react";
import { Camera, Upload, Scan, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { GroceryCategory, ShoppingItem } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface CameraCaptureProps {
  onItemsDetected: (items: string[]) => void;
  onAddToShoppingList: (item: string, quantity?: number, category?: GroceryCategory) => void | Promise<void>;
  shoppingList?: ShoppingItem[];
  onMarkAsBought?: (id: string) => void | Promise<void>;
}

const CameraCapture = ({
  onItemsDetected,
  onAddToShoppingList,
}: CameraCaptureProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // ── Image analysis via detect-items edge function ─────────────────────────
  const analyzeImage = async (imageData: string): Promise<string[]> => {
    setIsAnalyzing(true);
    try {
      console.log("Starting image analysis via detect-items...");

      const { data, error } = await supabase.functions.invoke("detect-items", {
        body: { image: imageData }, // full data URL — function splits it server-side
      });

      if (error) throw error;

      const items = Array.isArray(data?.items)
        ? data.items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

      console.log("Detected items:", items);
      return items;
    } catch (error) {
      console.error("Image analysis failed:", error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Handle captured or uploaded image ─────────────────────────────────────
  const handleImageCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setDetectedItems([]);

    try {
      const items = await analyzeImage(imageData);
      setDetectedItems(items);
      onItemsDetected(items);

      toast({
        title: "Analysis complete",
        description: `Detected ${items.length} item${items.length !== 1 ? "s" : ""} in your photo.`,
      });
    } catch {
      toast({
        title: "Analysis failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { fileToSafeDataUrl } = await import("@/lib/imageUtils");
      const dataUrl = await fileToSafeDataUrl(file);
      handleImageCapture(dataUrl);
    } catch {
      toast({
        title: "Could not read image",
        description: "Please try a JPEG or PNG instead.",
        variant: "destructive",
      });
    }
    event.target.value = "";
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
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
    } catch {
      setIsCameraOpen(false);
      toast({
        title: "Camera access failed",
        description: "Could not access camera. Try uploading an image instead.",
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
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setIsCameraOpen(false);
    setIsCapturing(false);
    handleImageCapture(imageData);
  };

  return (
    <div className="space-y-5">
      {/* Capture buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          onClick={startCamera}
          disabled={isCapturing || isAnalyzing}
          variant="fresh"
          size="lg"
          className="h-16"
        >
          <Camera className="mr-2 h-6 w-6" />
          {isCapturing ? "Capturing..." : "Take Photo"}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          variant="warm"
          size="lg"
          className="h-16"
        >
          <Upload className="mr-2 h-6 w-6" />
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

      {/* Live camera preview */}
      {isCameraOpen && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-medium">Camera Preview</h3>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="mx-auto w-full max-w-md rounded-lg bg-muted shadow-soft"
            />
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={capturePhoto}
                variant="fresh"
                size="lg"
                disabled={isCapturing || isAnalyzing}
              >
                <Camera className="mr-2 h-5 w-5" />
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
          </CardContent>
        </Card>
      )}

      {/* Analyzing state */}
      {isAnalyzing && (
        <Card className="border-primary shadow-glow">
          <CardContent className="flex items-center justify-center p-6">
            <div className="space-y-3 text-center">
              <Scan className="mx-auto h-8 w-8 animate-pulse text-primary" />
              <p className="text-base font-medium">Analyzing your photo...</p>
              <p className="text-sm text-muted-foreground">
                AI is identifying items in the image
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected items */}
      {detectedItems.length > 0 && !isAnalyzing && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Detected items ({detectedItems.length})
              </h3>
              <Badge variant="secondary">{detectedItems.length} found</Badge>
            </div>
            <div className="space-y-2">
              {detectedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-sm font-medium">{item}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onAddToShoppingList(item);
                      toast({ title: `${item} added to shopping list` });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captured image preview */}
      {capturedImage && !isAnalyzing && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-medium">Last captured image</h3>
            <img
              src={capturedImage}
              alt="Captured pantry photo"
              loading="lazy"
              className="mx-auto w-full max-w-md rounded-lg shadow-soft"
            />
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="space-y-1 p-4">
          <h3 className="text-sm font-medium">Tips for better results</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Good lighting makes a big difference</li>
            <li>• Keep items clearly visible and unobstructed</li>
            <li>• Include product labels when possible</li>
            <li>• Take multiple photos to cover the whole pantry</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;
