import type { Action, PetDesign } from './Pet';
import type { Reaction } from './model';

export interface DesktopState {
  pet: { design: PetDesign; reactions: Reaction[] };
  listening: boolean;
  starting: boolean;
  visible: boolean;
  error: string;
  platform: string;
}
export interface DesktopReaction {
  action: Action | 'tap';
  phrase: string;
}
export interface DesktopBridge {
  getState(): Promise<DesktopState>;
  updatePet(pet: DesktopState['pet']): Promise<DesktopState>;
  setEnabled(enabled: boolean): Promise<DesktopState>;
  showPet(): Promise<DesktopState>;
  openDesigner(): Promise<void>;
  preview(reaction: { action: Action; phrase: string }): Promise<void>;
  setInteractive(interactive: boolean): void;
  quit(): Promise<void>;
  onState(callback: (state: DesktopState) => void): () => void;
  onReaction(callback: (reaction: DesktopReaction) => void): () => void;
}
declare global {
  interface Window {
    keycritter?: DesktopBridge;
  }
}
