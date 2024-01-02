declare global {
interface Window { gapi: any; google: any; }
}

export const excelRegex = /\.(xls[xm]?|xlsm|csv)$/g;
export const googleID = /[-\w]{25,}/;
export const allowedTypes = /(ppt|pptx|doc|docx|txt|pdf)$/g;

export const LOCAL_STORAGE = 'dyte-recents-drive';
export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
export const API_BASE = import.meta.env.VITE_API_BASE;
export const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
export const DEV_KEY = import.meta.env.VITE_GOOGLE_DEV_KEY;
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export type Extension = 'googledocs' | 'googleslides' | 'txt' | 'doc' | 'ppt' | 'pdf' | 'unsupported' | 'file';

export type Tools =
  'pencil'
  | 'shape'
  | 'text'
  | 'erase'
  | 'erase-all'
  | 'highlight'
  | 'color'
  | 'cursor';

export interface ToolData {
    icon: string;
    tool: Tools;
    label: string;
}

export interface CursorPoints {
    xP: number;
    yP: number;
    xC: number;
    yC: number;
}

export const tools: ToolData[] = [
    {icon: 'cursor', tool: 'cursor', label: 'Cursor'},
    {icon: 'draw', tool: 'pencil', label: 'Pencil'},
    {icon: 'highlight', tool: 'highlight', label: 'Highlighter' },
    {icon: 'shape', tool: 'shape', label: 'Shape' },
    {icon: 'text', tool: 'text', label: 'Text' },
    {icon: 'eraser', tool: 'erase', label: 'Eraser' },
    {icon: 'eraseAll', tool: 'erase-all', label: 'Erase All' },
    {icon: 'colour', tool: 'color', label: 'Colours' },
]

export interface LocalData {
    url: string;
    type: Extension;
    google: boolean;
    metadata?: {
        id: string;
        kind: string;
        mimeType: string;
        size: number;
        name: string;
    }
}

export const colors = ['pink', 'red', 'orange', 'blue', 'yellow', 'black', 'white', 'grey', 'purple', 'peach', 'green', 'olive'];


export const driveViews: any[] = ["presentations", "pdfs", "folders"];

export const allowedMimeTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.google-apps.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.google-apps.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];


export const errorCodes = {
    '001': 'Broken Google document link.',
    '002': 'Unsupported file type.',
    '003': 'Access denied. Please ensure that this file is public.',
    '004': 'Failed to upload file.'
};

export enum pluginEvents {
    DELETE_FILE = 'delete-file',
}

export const pdfOptions = {
    cMapUrl: 'cmaps/',
    standardFontDataUrl: 'standard_fonts/',
};