import { useEffect, useRef, useState } from "preact/hooks";

interface Props {
  /** 現在の画像URL */
  currentImageUrl?: string | null;
  /** 画像の形状 */
  shape: "circle" | "square";
  /** プレビューサイズ (px) */
  previewSize?: number;
  /** アップロード先の種類 */
  uploadType: "politician_photo" | "party_logo" | "organization_logo";
  /** 関連するエンティティのID */
  entityId: string;
  /** アップロード完了時のコールバック */
  onUploadComplete?: (url: string) => void;
  /** ラベル */
  label?: string;
}

// Cropper.js の型定義（CDNから読み込むため）
interface CropperInstance {
  destroy(): void;
  getCroppedCanvas(options?: {
    width?: number;
    height?: number;
    imageSmoothingEnabled?: boolean;
    imageSmoothingQuality?: "low" | "medium" | "high";
  }): HTMLCanvasElement;
}

interface CropperConstructor {
  new (
    element: HTMLImageElement,
    options?: {
      aspectRatio?: number;
      viewMode?: number;
      dragMode?: string;
      autoCropArea?: number;
      restore?: boolean;
      guides?: boolean;
      center?: boolean;
      highlight?: boolean;
      cropBoxMovable?: boolean;
      cropBoxResizable?: boolean;
      toggleDragModeOnDblclick?: boolean;
    }
  ): CropperInstance;
}

declare global {
  interface Window {
    Cropper: CropperConstructor;
  }
}

export default function ImageCropper({
  currentImageUrl,
  shape,
  previewSize = 128,
  uploadType,
  entityId,
  onUploadComplete,
  label,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [cropperLoaded, setCropperLoaded] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<CropperInstance | null>(null);

  // Cropper.js を CDN から読み込み
  useEffect(() => {
    // CSS
    if (!document.getElementById("cropper-css")) {
      const link = document.createElement("link");
      link.id = "cropper-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css";
      document.head.appendChild(link);
    }

    // JS
    if (!window.Cropper) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js";
      script.onload = () => setCropperLoaded(true);
      document.head.appendChild(script);
    } else {
      setCropperLoaded(true);
    }
  }, []);

  // Cropper インスタンスを初期化
  useEffect(() => {
    if (!previewUrl || !imageRef.current || !cropperLoaded || !window.Cropper) {
      return;
    }

    // 既存の Cropper を破棄
    if (cropperRef.current) {
      cropperRef.current.destroy();
    }

    // 新しい Cropper を作成
    cropperRef.current = new window.Cropper(imageRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      // 円形プレビューはCSSで対応
    });

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [previewUrl, cropperLoaded]);

  // ファイル選択時
  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "画像ファイルを選択してください" });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "ファイルサイズは5MB以下にしてください",
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setMessage(null);
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // アップロード
  const handleUpload = async () => {
    if (!selectedFile || !cropperRef.current) return;

    setIsUploading(true);
    setMessage(null);

    try {
      // Cropper からトリミング済み Canvas を取得
      const canvas = cropperRef.current.getCroppedCanvas({
        width: 512, // 出力サイズ
        height: 512,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });

      // Canvas を Blob に変換
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b: Blob | null) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          },
          "image/png",
          0.9
        );
      });

      // FormData を作成
      const formData = new FormData();
      formData.append("file", blob, `${uploadType}_${entityId}.png`);
      formData.append("type", uploadType);
      formData.append("entity_id", entityId);

      // アップロード
      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "アップロードに失敗しました");
      }

      const result = await response.json();
      setMessage({ type: "success", text: "画像をアップロードしました" });

      // プレビューをリセット
      setSelectedFile(null);
      setPreviewUrl(null);

      if (onUploadComplete) {
        onUploadComplete(result.data.url);
      }

      // ページをリロードして新しい画像を表示
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "アップロードに失敗しました",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // キャンセル
  const handleCancel = () => {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setMessage(null);
  };

  return (
    <div class="space-y-4">
      {label && (
        <label class="label">
          <span class="label-text font-medium">{label}</span>
        </label>
      )}

      {message && (
        <div
          role="alert"
          class={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* 現在の画像またはプレースホルダー */}
      {!previewUrl && (
        <div class="flex items-center gap-4">
          <div
            class={`${
              shape === "circle" ? "rounded-full" : "rounded-lg"
            } bg-base-200 flex items-center justify-center overflow-hidden border-2 border-base-300`}
            style={{ width: previewSize, height: previewSize }}
          >
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Current"
                class="w-full h-full object-cover"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                class="w-12 h-12 text-base-content/30"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              class="file-input file-input-bordered file-input-sm"
            />
            <p class="text-xs text-base-content/50 mt-1">
              JPEG, PNG, WebP, GIF (最大5MB)
            </p>
          </div>
        </div>
      )}

      {/* Cropper エディタ */}
      {previewUrl && (
        <div class="space-y-4">
          {/* Cropper コンテナ */}
          <div
            class="w-full max-w-md mx-auto bg-base-200 rounded-lg overflow-hidden"
            style={{ maxHeight: "400px" }}
          >
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Crop target"
              class="block max-w-full"
              style={{ display: "block" }}
            />
          </div>

          {/* 操作ガイド */}
          <p class="text-sm text-base-content/70 text-center">
            ドラッグで位置調整、スクロールでズーム、四隅をドラッグでサイズ変更
          </p>

          {/* 円形プレビュー用のCSS追加 */}
          {shape === "circle" && (
            <style>{`
              .cropper-view-box,
              .cropper-face {
                border-radius: 50%;
              }
            `}</style>
          )}

          {/* 操作ボタン */}
          <div class="flex justify-center gap-2">
            <button
              type="button"
              class="btn btn-primary"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span class="loading loading-spinner loading-sm" />
                  アップロード中...
                </>
              ) : (
                "アップロード"
              )}
            </button>
            <button
              type="button"
              class="btn"
              onClick={handleCancel}
              disabled={isUploading}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
