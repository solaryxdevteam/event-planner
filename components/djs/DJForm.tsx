"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDjSchema, updateDjSchema, type CreateDjInput, type UpdateDjInput } from "@/lib/validation/djs.schema";
import { useCreateDj, useUpdateDj } from "@/lib/hooks/use-djs";
import type { DJ, DJRiderFile } from "@/lib/types/database.types";
import Image from "next/image";
import { ArrowLeft, Loader2, FileUp, ImageIcon, FileText, Trash2, Video } from "lucide-react";
import { FileUploader } from "@/components/ui/file-uploader";
import { PriceInput } from "@/components/ui/price-input";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

type DJFormValues = CreateDjInput;

function riderFileTypeFromFile(file: File): "photo" | "video" | "file" {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

interface DJFormProps {
  mode: "create" | "edit" | "view";
  dj?: DJ | null;
}

export function DJForm({ mode, dj }: DJFormProps) {
  const router = useRouter();
  const [pictureUploading, setPictureUploading] = useState(false);
  const [techRiderUploading, setTechRiderUploading] = useState(false);
  const [hospRiderUploading, setHospRiderUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const schema = mode === "create" ? createDjSchema : updateDjSchema;
  const isViewMode = mode === "view";
  const defaultValues: DJFormValues = {
    name: dj?.name ?? "",
    picture_url: dj?.picture_url ?? null,
    music_style: dj?.music_style ?? null,
    price: dj?.price ?? null,
    email: dj?.email ?? "",
    technical_rider: Array.isArray(dj?.technical_rider) ? dj.technical_rider : [],
    hospitality_rider: Array.isArray(dj?.hospitality_rider) ? dj.hospitality_rider : [],
  };

  const form = useForm<DJFormValues>({
    resolver: zodResolver(schema) as Resolver<DJFormValues>,
    defaultValues,
  });

  const createMutation = useCreateDj();
  const updateMutation = useUpdateDj();

  const uploadFile = async (file: File, type: "picture" | "rider"): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await fetch("/api/djs/upload-file", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Upload failed");
    }
    const data = await res.json();
    return data.url;
  };

  const handlePictureSelect = async (files: File[]) => {
    if (!files.length) return;
    setPictureUploading(true);
    try {
      const url = await uploadFile(files[0], "picture");
      form.setValue("picture_url", url, { shouldValidate: true });
    } catch (e) {
      form.setError("picture_url", { message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setPictureUploading(false);
    }
  };

  const handleTechRiderSelect = async (files: File[]) => {
    if (!files.length) return;
    setTechRiderUploading(true);
    const current = form.getValues("technical_rider") ?? [];
    try {
      const next: DJRiderFile[] = [...current];
      for (const file of files) {
        const url = await uploadFile(file, "rider");
        next.push({ url, type: riderFileTypeFromFile(file) });
      }
      form.setValue("technical_rider", next, { shouldValidate: true });
    } catch (e) {
      form.setError("technical_rider", { message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setTechRiderUploading(false);
    }
  };

  const handleHospRiderSelect = async (files: File[]) => {
    if (!files.length) return;
    setHospRiderUploading(true);
    const current = form.getValues("hospitality_rider") ?? [];
    try {
      const next: DJRiderFile[] = [...current];
      for (const file of files) {
        const url = await uploadFile(file, "rider");
        next.push({ url, type: riderFileTypeFromFile(file) });
      }
      form.setValue("hospitality_rider", next, { shouldValidate: true });
    } catch (e) {
      form.setError("hospitality_rider", { message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setHospRiderUploading(false);
    }
  };

  const clearPicture = () => {
    form.setValue("picture_url", null, { shouldValidate: true });
  };
  const removeTechnicalRiderAt = (index: number) => {
    const arr = form.getValues("technical_rider") ?? [];
    form.setValue(
      "technical_rider",
      arr.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  };
  const removeHospitalityRiderAt = (index: number) => {
    const arr = form.getValues("hospitality_rider") ?? [];
    form.setValue(
      "hospitality_rider",
      arr.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  };

  const onSubmit = async (data: DJFormValues) => {
    const payload: CreateDjInput = {
      name: data.name,
      email: data.email,
      picture_url: data.picture_url ?? null,
      music_style: data.music_style ?? null,
      price: data.price ?? null,
      technical_rider: data.technical_rider ?? [],
      hospitality_rider: data.hospitality_rider ?? [],
    };
    if (mode === "create") {
      await createMutation.mutateAsync(payload);
      router.push("/dashboard/djs");
    } else if (dj) {
      const updates: UpdateDjInput = {
        name: payload.name,
        picture_url: payload.picture_url,
        music_style: payload.music_style,
        price: payload.price,
        email: payload.email,
        technical_rider: payload.technical_rider,
        hospitality_rider: payload.hospitality_rider,
      };
      await updateMutation.mutateAsync({ id: dj.short_id, input: updates });
      router.push("/dashboard/djs");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="DJ name"
          readOnly={isViewMode}
          disabled={isViewMode}
          className={isViewMode ? "bg-muted" : undefined}
        />
        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Picture
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {!isViewMode && (
            <FileUploader
              accept="image/*"
              multiple={false}
              maxFiles={1}
              currentCount={form.watch("picture_url") ? 1 : 0}
              onFilesSelected={handlePictureSelect}
              acceptLabel="Image (JPEG, PNG, WebP)"
              disabled={pictureUploading}
              uploadProgress={pictureUploading ? 50 : undefined}
              className={form.watch("picture_url") ? "col-span-2" : "col-span-3"}
            />
          )}
          {form.watch("picture_url") && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3 col-span-1">
              <button
                type="button"
                className="relative h-full w-full overflow-hidden rounded-md bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setMediaPreview({ url: form.watch("picture_url")!, type: "image" })}
              >
                <Image
                  src={form.watch("picture_url")!}
                  alt="DJ picture"
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="64px"
                />
              </button>
              {/* <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Photo uploaded</p>
              </div> */}
              {!isViewMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={clearPicture}
                  aria-label="Delete picture"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {form.formState.errors.picture_url && (
          <p className="text-sm text-destructive">{form.formState.errors.picture_url.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="music_style">Music style</Label>
        <Input
          id="music_style"
          {...form.register("music_style")}
          placeholder="e.g. House, Techno, Hip-Hop"
          readOnly={isViewMode}
          disabled={isViewMode}
          className={isViewMode ? "bg-muted" : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price+++</Label>
        <PriceInput
          id="price"
          value={form.watch("price") ?? undefined}
          onChange={(v) => form.setValue("price", v ?? null, { shouldValidate: true })}
          placeholder="0.00"
          disabled={isViewMode}
          className={isViewMode ? "bg-muted" : undefined}
        />
        {form.formState.errors.price && (
          <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="dj@example.com"
          readOnly={isViewMode}
          disabled={isViewMode}
          className={isViewMode ? "bg-muted" : undefined}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Technical rider
          </Label>
          {!isViewMode && (
            <FileUploader
              accept=".pdf,image/*,video/*,.doc,.docx"
              multiple={true}
              maxFiles={20}
              currentCount={(form.watch("technical_rider") ?? []).length}
              onFilesSelected={handleTechRiderSelect}
              acceptLabel="PDF, images, video"
              disabled={techRiderUploading}
              uploadProgress={techRiderUploading ? 50 : undefined}
            />
          )}
          {(form.watch("technical_rider") ?? []).length > 0 && (
            <ul className="space-y-2">
              {(form.watch("technical_rider") ?? []).map((item, index) => (
                <li
                  key={`${item.url}-${index}`}
                  className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                >
                  {item.type === "photo" && (
                    <button
                      type="button"
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => setMediaPreview({ url: item.url, type: "image" })}
                    >
                      <Image src={item.url} alt="" fill className="object-cover" unoptimized sizes="40px" />
                    </button>
                  )}
                  {item.type === "video" && (
                    <button
                      type="button"
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center"
                      onClick={() => setMediaPreview({ url: item.url, type: "video" })}
                    >
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                  {item.type === "file" && <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate flex-1 text-primary hover:underline"
                  >
                    {item.url.split("/").pop() ?? "File"}
                  </a>
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTechnicalRiderAt(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {form.formState.errors.technical_rider && (
            <p className="text-sm text-destructive">{form.formState.errors.technical_rider.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hospitality rider
          </Label>
          {!isViewMode && (
            <FileUploader
              accept=".pdf,image/*,video/*,.doc,.docx"
              multiple={true}
              maxFiles={20}
              currentCount={(form.watch("hospitality_rider") ?? []).length}
              onFilesSelected={handleHospRiderSelect}
              acceptLabel="PDF, images, video"
              disabled={hospRiderUploading}
              uploadProgress={hospRiderUploading ? 50 : undefined}
            />
          )}
          {(form.watch("hospitality_rider") ?? []).length > 0 && (
            <ul className="space-y-2">
              {(form.watch("hospitality_rider") ?? []).map((item, index) => (
                <li
                  key={`${item.url}-${index}`}
                  className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                >
                  {item.type === "photo" && (
                    <button
                      type="button"
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => setMediaPreview({ url: item.url, type: "image" })}
                    >
                      <Image src={item.url} alt="" fill className="object-cover" unoptimized sizes="40px" />
                    </button>
                  )}
                  {item.type === "video" && (
                    <button
                      type="button"
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center"
                      onClick={() => setMediaPreview({ url: item.url, type: "video" })}
                    >
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                  {item.type === "file" && <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate flex-1 text-primary hover:underline"
                  >
                    {item.url.split("/").pop() ?? "File"}
                  </a>
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHospitalityRiderAt(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {form.formState.errors.hospitality_rider && (
            <p className="text-sm text-destructive">{form.formState.errors.hospitality_rider.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {!isViewMode && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Add DJ" : "Save changes"}
          </Button>
        )}
      </div>

      {mediaPreview && (
        <MediaPreviewDialog
          open={!!mediaPreview}
          onOpenChange={(open) => !open && setMediaPreview(null)}
          type={mediaPreview.type}
          url={mediaPreview.url}
        />
      )}
    </form>
  );
}
