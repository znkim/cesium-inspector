import { Cartesian3, Cartographic, Math as CesiumMath, type Viewer } from 'cesium';
import type { SlideRecord, SlideShowState } from '../types/resources';

interface CesiumSlideShowOptions {
  storageKey?: string;
  defaultDuration?: number;
  defaultPause?: number;
  loop?: boolean;
}

type SlideShowListener = (state: SlideShowState) => void;

function cloneSlide(slide: SlideRecord): SlideRecord {
  return {
    ...slide,
    destination: { ...slide.destination },
    orientation: { ...slide.orientation },
  };
}

export class CesiumSlideShow {
  private viewer: Viewer;

  private slides: SlideRecord[] = [];

  private listeners = new Set<SlideShowListener>();

  private storageKey: string;

  private defaultDuration: number;

  private defaultPause: number;

  private loop: boolean;

  private currentIndex = -1;

  private isPlaying = false;

  private stopRequested = false;

  private playToken = 0;

  private timer: number | null = null;

  constructor(viewer: Viewer, options: CesiumSlideShowOptions = {}) {
    if (!viewer) {
      throw new Error('viewer is required.');
    }

    this.viewer = viewer;
    this.storageKey = options.storageKey ?? 'cesium-slideshow';
    this.defaultDuration = options.defaultDuration ?? 3;
    this.defaultPause = options.defaultPause ?? 1;
    this.loop = options.loop ?? false;
    this.loadFromLocalStorage();
  }

  subscribe(listener: SlideShowListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SlideShowState {
    return {
      slides: this.slides.map(cloneSlide),
      currentIndex: this.currentIndex,
      currentSlide: this.getCurrentSlide(),
      isPlaying: this.isPlaying,
    };
  }

  saveToLocalStorage(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        slides: this.slides,
      }),
    );
  }

  loadFromLocalStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { slides?: SlideRecord[] };
      this.slides = Array.isArray(parsed.slides) ? parsed.slides : [];
    } catch (error) {
      console.warn('Failed to load slideshow data.', error);
      this.slides = [];
    }
  }

  recordLocation(name = ''): SlideRecord {
    const camera = this.viewer.camera;
    const cartographic = Cartographic.fromCartesian(camera.positionWC);
    const index = this.slides.length + 1;
    const slideName = name.trim() ? name.trim() : `Slide ${index}`;

    const slide: SlideRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: slideName,
      destination: {
        lon: CesiumMath.toDegrees(cartographic.longitude),
        lat: CesiumMath.toDegrees(cartographic.latitude),
        height: cartographic.height,
      },
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
      duration: this.defaultDuration,
      pause: this.defaultPause,
      createdAt: new Date().toISOString(),
    };

    this.slides.push(slide);
    this.saveToLocalStorage();
    this.notify();
    return cloneSlide(slide);
  }

  removeSlide(index: number): boolean {
    if (index < 0 || index >= this.slides.length) {
      return false;
    }

    this.slides.splice(index, 1);

    if (this.currentIndex === index) {
      this.currentIndex = this.slides.length === 0 ? -1 : Math.min(index, this.slides.length - 1);
    } else if (this.currentIndex > index) {
      this.currentIndex -= 1;
    }

    this.saveToLocalStorage();
    this.notify();
    return true;
  }

  async goToSlide(index: number, duration?: number): Promise<boolean> {
    if (index < 0 || index >= this.slides.length) {
      return false;
    }

    const slide = this.slides[index];
    this.currentIndex = index;
    this.notify();

    return new Promise((resolve) => {
      this.viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          slide.destination.lon,
          slide.destination.lat,
          slide.destination.height,
        ),
        orientation: {
          heading: slide.orientation.heading,
          pitch: slide.orientation.pitch,
          roll: slide.orientation.roll,
        },
        duration: duration ?? slide.duration ?? this.defaultDuration,
        complete: () => {
          this.notify();
          resolve(true);
        },
        cancel: () => {
          this.notify();
          resolve(false);
        },
      });
    });
  }

  async startSlideShow(options: { startIndex?: number; duration?: number; pause?: number; loop?: boolean } = {}): Promise<void> {
    if (this.slides.length === 0) {
      return;
    }

    this.stopSlideShow();

    this.isPlaying = true;
    this.stopRequested = false;
    this.playToken += 1;
    this.notify();

    const token = this.playToken;
    const loop = options.loop ?? this.loop;
    let index = options.startIndex ?? 0;

    while (!this.stopRequested && token === this.playToken) {
      if (index >= this.slides.length) {
        if (!loop) break;
        index = 0;
      }

      const moved = await this.goToSlide(index, options.duration);
      if (!moved || this.stopRequested || token !== this.playToken) {
        break;
      }

      const slide = this.slides[index];
      const pause = options.pause ?? slide.pause ?? this.defaultPause;

      if (pause > 0) {
        await new Promise<void>((resolve) => {
          this.timer = window.setTimeout(() => {
            this.timer = null;
            resolve();
          }, pause * 1000);
        });

        if (this.stopRequested || token !== this.playToken) {
          break;
        }
      }

      index += 1;
    }

    this.isPlaying = false;
    this.clearTimer();
    this.notify();
  }

  stopSlideShow(): void {
    this.stopRequested = true;
    this.isPlaying = false;
    this.playToken += 1;
    this.clearTimer();
    this.viewer.camera.cancelFlight();
    this.notify();
  }

  getCurrentSlide(): SlideRecord | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.slides.length) {
      return null;
    }

    return cloneSlide(this.slides[this.currentIndex]);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
