"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateProfile, updateProfilePicture } from "@/app/actions/settings";
import type { User } from "@/lib/db/schema";
import { Upload, X, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing-hooks";
import { resizeImage } from "@/lib/image-utils";

export function SettingsForm({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateProfile(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated!");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="text-xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger
                render={<Button type="button" variant="outline" size="sm" />}
              >
                <Camera className="size-4 mr-2" />
                Change Photo
              </DialogTrigger>
              <ProfilePictureModal
                user={user}
                onClose={() => setModalOpen(false)}
              />
            </Dialog>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ""}
                placeholder="Tell others a bit about yourself..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label>Postcode</Label>
              <Input
                value={user.postcode || "Not set"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to update your postcode
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfilePictureModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [previewImage, setPreviewImage] = useState<string | null>(
    user.image || null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { startUpload, isUploading } = useUploadThing("profilePicture", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        setUploadedUrl(res[0].url);
        toast.success("Image uploaded!");
      }
    },
    onUploadError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        toast.error("Image must be less than 4MB");
        return;
      }

      let resized: File;
      try {
        resized = await resizeImage(file);
      } catch {
        toast.error("Failed to process image");
        return;
      }

      setSelectedFile(resized);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(resized);

      await startUpload([resized]);
    },
    [startUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    },
    [handleFileChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFileChange(file);
    },
    [handleFileChange],
  );

  const clearImage = useCallback(() => {
    setPreviewImage(null);
    setSelectedFile(null);
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSave = async () => {
    if (isUploading) {
      toast.error("Please wait for upload to complete");
      return;
    }

    setSaving(true);
    const formData = new FormData();

    if (uploadedUrl) {
      formData.set("avatarUrl", uploadedUrl);
    } else if (previewImage === null && user.image) {
      formData.set("removeAvatar", "true");
    } else {
      toast.error("No changes to save");
      setSaving(false);
      return;
    }

    try {
      const result = await updateProfilePicture(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile picture updated!");
        onClose();
        window.location.reload();
      }
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Change Profile Picture</DialogTitle>
        <DialogDescription>
          Upload a new photo or remove your current one
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="size-32">
              <AvatarImage src={previewImage || undefined} alt={user.name} />
              <AvatarFallback className="text-4xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {previewImage && (
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-2 -right-2 size-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all text-center",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="size-6 text-primary animate-spin" />
              ) : isDragging ? (
                <Camera className="size-6 text-primary" />
              ) : (
                <Upload className="size-6 text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isUploading
                  ? "Uploading..."
                  : isDragging
                    ? "Drop your photo here"
                    : "Click to upload or drag and drop"}
              </p>
              {!isDragging && !isUploading && (
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or GIF up to 4MB
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || isUploading || !uploadedUrl}
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Photo"
          )}
        </Button>
      </div>
    </DialogContent>
  );
}
