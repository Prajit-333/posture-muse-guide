export async function generateReportCanvas(
  levelScores: number[],
  feedbacks: string[][] | undefined,
  levelDetails: Array<{ level: number; slug: string; name: string; difficulty: string }> | undefined,
  poseLibrary: Array<any> | undefined,
  totalScore: number
): Promise<HTMLCanvasElement | null> {
  const width = 1400;
  const padding = 48;
  const thumbSize = 120;
  const gap = 20;
  const perLevelHeight = Math.max(thumbSize + 20, 120);

  // compute height based on number of levels (header + per-level blocks + footer)
  const height = padding * 2 + 160 + levelScores.length * perLevelHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Inter, system-ui, Arial";
  ctx.fillText("Posture Muse — Challenge Report", padding, padding + 12);

  // Subheader
  ctx.fillStyle = "#374151";
  ctx.font = "16px Inter, system-ui, Arial";
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, padding, padding + 44);

  // Total score badge
  ctx.fillStyle = "#064e3b"; // deep teal
  const badgeX = width - padding - 260;
  const badgeY = padding;
  ctx.fillRect(badgeX, badgeY, 260, 120);
  ctx.fillStyle = "#fff";
  ctx.font = "700 56px Inter, system-ui, Arial";
  ctx.fillText(`${totalScore}`, badgeX + 26, badgeY + 72);
  ctx.font = "500 16px Inter, system-ui, Arial";
  ctx.fillText("Total Score", badgeX + 26, badgeY + 98);

  // Prepare to fetch thumbnails for each level (if available).
  // Use fetch + createImageBitmap so we can detect CORS failures early and avoid tainting the canvas.
  const images: Array<ImageBitmap | null> = await Promise.all(
    levelScores.map(async (_s, i) => {
      const details = levelDetails?.[i];
      let thumbUrl: string | undefined;
      if (details && poseLibrary) {
        const pose = poseLibrary.find((p: any) => p.slug === details.slug);
        if (pose && pose.thumbnail) thumbUrl = pose.thumbnail;
      }

      if (!thumbUrl) return null;

      try {
        // Try to fetch the image with CORS. If the server doesn't allow CORS, this will fail.
        const resp = await fetch(thumbUrl, { mode: "cors" });
        if (!resp.ok) throw new Error(`Image fetch failed ${resp.status}`);
        const blob = await resp.blob();
        // createImageBitmap will create a bitmap we can draw on the canvas without crossOrigin issues
        const bitmap = await createImageBitmap(blob);
        return bitmap;
      } catch (err) {
        // Fetch failed or CORS blocked; fall back to null so a placeholder is drawn.
        // Log to console to help debugging in dev.
        // eslint-disable-next-line no-console
        console.warn(`Could not load thumbnail for level ${i + 1}:`, thumbUrl, err);
        return null;
      }
    })
  );

  // Draw per-level rows
  let y = padding + 160;
  ctx.font = "700 18px Inter, system-ui, Arial";
  for (let i = 0; i < levelScores.length; i++) {
    const score = levelScores[i];
    const details = levelDetails?.[i];
    const name = details?.name || `Level ${i + 1}`;
    const difficulty = details?.difficulty || "";

    // Thumbnail
    const imgBitmap = images[i];
    if (imgBitmap) {
      // draw ImageBitmap
      ctx.drawImage(imgBitmap, padding, y - 16, thumbSize, thumbSize);
      // close bitmap to free resources where supported
      try { imgBitmap.close?.(); } catch (e) { /* ignore */ }
    } else {
      // placeholder box
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(padding, y - 16, thumbSize, thumbSize);
    }

    // Level text
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Inter, system-ui, Arial";
    ctx.fillText(`${i + 1}. ${name}`, padding + thumbSize + gap, y + 10);

    ctx.font = "500 14px Inter, system-ui, Arial";
    ctx.fillStyle = "#475569";
    ctx.fillText(`Difficulty: ${difficulty}`, padding + thumbSize + gap, y + 36);

    ctx.fillStyle = "#064e3b";
    ctx.font = "700 22px Inter, system-ui, Arial";
    ctx.fillText(score === 0 ? "—" : `${score}/100`, width - padding - 120, y + 26);

    // Tips
    const tips = (feedbacks?.[i] || []).slice(0, 4);
    ctx.font = "14px Inter, system-ui, Arial";
    ctx.fillStyle = "#374151";
    let tipY = y + 56;
    for (const t of tips) {
      // wrap small lines if necessary (simple truncation)
      const text = t.length > 80 ? t.slice(0, 77) + "…" : t;
      ctx.fillText(`• ${text}`, padding + thumbSize + gap, tipY);
      tipY += 20;
    }

    y += perLevelHeight;
  }

  // Footer
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px Inter, system-ui, Arial";
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, padding, height - 20);

  return canvas;
}
