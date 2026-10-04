/*
 * Simple on-device motion detection (frame differencing).
 *
 * Each sample shrinks the camera frame to 64×48 grayscale and counts how many
 * pixels changed noticeably since the previous frame. Nothing is recorded or
 * uploaded — frames are compared in memory and thrown away.
 *
 * This detects "is the person moving", not specific exercises. Pose detection
 * (counting real squats or jumping jacks) can replace it later behind the same API.
 */

const WIDTH = 64;
const HEIGHT = 48;
/** How much a pixel's brightness must change (0–255) to count as movement. */
const PIXEL_THRESHOLD = 28;

export class MotionDetector {
  private readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private previous: Float32Array | null = null;

  constructor(video: HTMLVideoElement) {
    this.video = video;
    this.canvas = document.createElement("canvas");
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas isn't available in this browser.");
    this.ctx = ctx;
  }

  /** Share of the picture (0–1) that changed since the last sample. */
  sample(): number {
    if (this.video.readyState < 2) return 0;
    this.ctx.drawImage(this.video, 0, 0, WIDTH, HEIGHT);
    const { data } = this.ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const gray = new Float32Array(WIDTH * HEIGHT);
    let changed = 0;
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
      if (this.previous && Math.abs(gray[i] - this.previous[i]) > PIXEL_THRESHOLD) changed++;
    }
    const hadPrevious = this.previous !== null;
    this.previous = gray;
    return hadPrevious ? changed / gray.length : 0;
  }
}

export async function openFrontCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't use the camera.");
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
    audio: false,
  });
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
