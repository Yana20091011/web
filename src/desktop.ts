import type { Action, PetDesign, PetPose } from './Pet';
import type { Reaction } from './model';

export interface DesktopState {
  version: string;
  pet: { design: PetDesign; reactions: Reaction[] };
  listening: boolean;
  starting: boolean;
  visible: boolean;
  pinned: boolean;
  error: string;
  platform: string;
}
export interface DesktopReaction {
  action: Action | 'tap';
  phrase: string;
}
export interface AIStatus {
  configured: boolean;
  remembered: boolean;
  canRemember: boolean;
}
export type AIConnectionResult = { ok: true; status: AIStatus } | { ok: false; error: string };
export interface ImageRequest {
  prompt: string;
  model: string;
  pose: PetPose;
  reference?: string;
}
export interface DesktopBridge {
  getState(): Promise<DesktopState>;
  updatePet(pet: DesktopState['pet']): Promise<DesktopState>;
  setEnabled(enabled: boolean): Promise<DesktopState>;
  showPet(): Promise<DesktopState>;
  setPinned(pinned: boolean): Promise<DesktopState>;
  getPinInfo(): Promise<{
    pinned: boolean;
    topmost: boolean;
    visible: boolean;
    nativeHandle: string;
  }>;
  openDesigner(): Promise<void>;
  preview(reaction: { action: Action; phrase: string }): Promise<void>;
  setInteractive(interactive: boolean): void;
  /** Name-bar anchor as fractions of the viewport, independent of zoom or display scaling. */
  startDrag(anchor: { x: number; y: number }): Promise<void>;
  moveDrag(): void;
  endDrag(interactive: boolean): Promise<void>;
  quit(): Promise<void>;
  onState(callback: (state: DesktopState) => void): () => void;
  onReaction(callback: (reaction: DesktopReaction) => void): () => void;
  getAIStatus(): Promise<AIStatus>;
  openAIKeyPage(): Promise<void>;
  setAIKey(key: string, remember: boolean): Promise<AIConnectionResult>;
  disconnectAI(): Promise<AIConnectionResult>;
  generateImage(
    request: ImageRequest,
  ): Promise<{ ok: true; image: string } | { ok: false; error: string }>;
  cancelGeneration(): Promise<void>;
}
declare global {
  interface Window {
    keycritter?: DesktopBridge;
  }
}
