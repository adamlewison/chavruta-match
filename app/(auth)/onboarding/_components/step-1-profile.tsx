"use client";

import { Upload, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Step1ProfileProps {
  name: string;
  setName: (name: string) => void;
  previewImage: string | null;
  isUploading: boolean;
  loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
  hasProviderImage: boolean;
  uploadedUrl: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Step1Profile({
  name,
  setName,
  previewImage,
  isUploading,
  loading,
  fileInputRef,
  onFileChange,
  hasProviderImage,
  uploadedUrl,
  onSubmit,
}: Step1ProfileProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="size-24">
          <AvatarImage src={previewImage || undefined} alt="Profile picture" />
          <AvatarFallback className="text-2xl">
            {(name?.charAt(0) || "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : previewImage ? (
            <Camera className="mr-2 size-4" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          {isUploading
            ? "Uploading..."
            : previewImage
              ? "Change photo"
              : "Upload photo"}
        </Button>
        {hasProviderImage && !uploadedUrl && (
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ve used your provider profile picture. You can change it if
            you like.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading || isUploading} className="mt-2">
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
