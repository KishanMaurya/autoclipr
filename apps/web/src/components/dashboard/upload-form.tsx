"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileVideo } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }, [title]);

  async function handleUpload() {
    if (!file || !title) return;
    setUploading(true);
    setError(null);
    setProgress(10);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Not authenticated");
      setUploading(false);
      return;
    }

    const init = await apiFetch<{
      video_id: string;
      upload_url: string;
      storage_path: string;
    }>("/api/v1/videos/upload", {
      method: "POST",
      token: session.access_token,
      body: JSON.stringify({
        title,
        filename: file.name,
        mime_type: file.type,
        size: file.size,
      }),
    });

    if (!init.success || !init.data) {
      setError(init.error?.message ?? "Failed to init upload");
      setUploading(false);
      return;
    }

    setProgress(30);

    try {
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(30 + Math.round((ev.loaded / ev.total) * 50));
          }
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", init.data!.upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch {
      setProgress(50);
    }

    setProgress(85);

    const complete = await apiFetch(`/api/v1/videos/${init.data.video_id}/complete`, {
      method: "POST",
      token: session.access_token,
    });

    if (!complete.success) {
      setError(complete.error?.message ?? "Failed to complete upload");
      setUploading(false);
      return;
    }

    setProgress(100);
    router.push("/clips");
    router.refresh();
  }

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5 text-violet-400" />
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5 px-6 py-16 text-center transition-colors hover:border-violet-500/50"
        >
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop your video, or{" "}
            <label className="cursor-pointer text-violet-400 hover:underline">
              browse
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                  }
                }}
              />
            </label>
          </p>
          {file && (
            <p className="mt-2 text-sm font-medium">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome video"
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          variant="gradient"
          className="w-full"
          disabled={!file || !title || uploading}
          onClick={handleUpload}
        >
          {uploading ? "Uploading…" : "Upload & Process"}
        </Button>
      </CardContent>
    </Card>
  );
}
