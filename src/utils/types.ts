import iconPack from '../icons/iconPack.json';

export type ToolbarState =
  'drawing-tool-pencil'
  | 'drawing-tool-shape'
  | 'drawing-tool-text'
  | 'drawing-tool-erase'
  | 'drawing-tool-erase-all'
  | 'drawing-tool-highlight'
  | 'export-tool'
  | 'zoom-in-tool'
  | 'zoom-out-tool'
  | 'none'
  | 'drawing-tool-cursor';

export interface CursorPoints {
  xP: number;
  yP: number;
  xC: number;
  yC: number;
}

export interface ToolData {
  icon: keyof typeof iconPack;
  tool: ToolbarState;
  label: string;
}