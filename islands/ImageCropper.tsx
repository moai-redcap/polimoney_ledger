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
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ファイル選択時
  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "画像ファイルを選択してください" });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCropPosition({ x: 0, y: 0 });
      setScale(1);
      setMessage(null);
    }
  };

  // 画像読み込み完了時
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      // 画像の中心に初期位置を設定
      setCropPosition({
        x: (imageRef.current.naturalWidth - previewSize / scale) / 2,
        y: (imageRef.current.naturalHeight - previewSize / scale) / 2,
      });
    }
  };

  // ドラッグ開始
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropPosition.x * scale,
      y: e.clientY - cropPosition.y * scale,
    });
  };

  // ドラッグ中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = (e.clientX - dragStart.x) / scale;
    const newY = (e.clientY - dragStart.y) / scale;

    // 境界チェック
    const maxX = Math.max(0, imageSize.width - previewSize / scale);
    const maxY = Math.max(0, imageSize.height - previewSize / scale);

    setCropPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  };

  // ドラッグ終了
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // タッチイベント用
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - cropPosition.x * scale,
        y: touch.clientY - cropPosition.y * scale,
      });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const newX = (touch.clientX - dragStart.x) / scale;
    const newY = (touch.clientY - dragStart.y) / scale;

    const maxX = Math.max(0, imageSize.width - previewSize / scale);
    const maxY = Math.max(0, imageSize.height - previewSize / scale);

    setCropPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // スケール変更
  const handleScaleChange = (e: Event) => {
    const newScale = parseFloat((e.target as HTMLInputElement).value);
    setScale(newScale);
  };

  // Canvas にプレビューを描画
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !previewUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = previewSize;
    canvas.height = previewSize;

    // 背景をクリア
    ctx.clearRect(0, 0, previewSize, previewSize);

    // 円形の場合はクリップ
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(
        previewSize / 2,
        previewSize / 2,
        previewSize / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      ctx.clip();
    }

    // 画像を描画
    const sourceSize = previewSize / scale;
    ctx.drawImage(
      imageRef.current,
      cropPosition.x,
      cropPosition.y,
      sourceSize,
      sourceSize,
      0,
      0,
      previewSize,
      previewSize
    );
  }, [previewUrl, cropPosition, scale, previewSize, shape]);

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
    if (!selectedFile || !canvasRef.current) return;

    setIsUploading(true);
    setMessage(null);

    try {
      // Canvas からトリミング済み画像を取得
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
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
            } bg-base-200 flex items-center justify-center overflow-hidden`}
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

      {/* トリミングエディタ */}
      {previewUrl && (
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            {/* 元画像エリア */}
            <div
              ref={containerRef}
              class="relative overflow-hidden border rounded-lg cursor-move"
              style={{
                width: Math.min(300, imageSize.width * scale),
                height: Math.min(300, imageSize.height * scale),
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* 非表示の元画像 */}
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Source"
                class="hidden"
                onLoad={handleImageLoad}
              />

              {/* 表示用画像 */}
              <img
                src={previewUrl}
                alt="Preview"
                class="pointer-events-none"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                draggable={false}
              />

              {/* クリップ領域表示 */}
              <div
                class={`absolute border-2 border-white shadow-lg pointer-events-none ${
                  shape === "circle" ? "rounded-full" : ""
                }`}
                style={{
                  width: previewSize,
                  height: previewSize,
                  left: cropPosition.x * scale,
                  top: cropPosition.y * scale,
                  boxShadow:
                    "0 0 0 9999px rgba(0, 0, 0, 0.5), inset 0 0 0 2px white",
                }}
              />
            </div>

            {/* プレビュー */}
            <div class="flex flex-col items-center gap-2">
              <p class="text-sm text-base-content/70">プレビュー</p>
              <canvas
                ref={canvasRef}
                class={`border ${
                  shape === "circle" ? "rounded-full" : "rounded-lg"
                }`}
                style={{ width: previewSize, height: previewSize }}
              />
            </div>
          </div>

          {/* ズームスライダー */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">ズーム</span>
              <span class="label-text-alt">{Math.round(scale * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={handleScaleChange}
              class="range range-sm"
            />
          </div>

          {/* 操作ボタン */}
          <div class="flex gap-2">
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
