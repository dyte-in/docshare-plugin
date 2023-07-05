import { ToolData } from "./types";

export const options = {
    cMapUrl: 'cmaps/',
    standardFontDataUrl: 'standard_fonts/',
};

export const colors = ['pink', 'red', 'orange', 'blue', 'yellow', 'black', 'white', 'grey', 'purple', 'peach', 'green', 'olive'];

export const tools: ToolData[] = [
    {icon: 'cursor', tool: 'drawing-tool-cursor', label: 'Cursor'},
    {icon: 'draw', tool: 'drawing-tool-pencil', label: 'Pencil'},
    {icon: 'highlight', tool: 'drawing-tool-highlight', label: 'Highlighter' },
    {icon: 'shape', tool: 'drawing-tool-shape', label: 'Shape' },
    {icon: 'text', tool: 'drawing-tool-text', label: 'Text' },
    {icon: 'eraser', tool: 'drawing-tool-erase', label: 'Eraser' },
    {icon: 'eraseAll', tool: 'drawing-tool-erase-all', label: 'Erase All' },
    {icon: 'download', tool: 'export-tool', label: 'Download' },
]

export const dashboardMessages = {
    'success': 'No Recent Files. Files are retained only for the duration of this session.',
    'error': 'An Error occured. Could not fetch files.',
}

export const errorMessages = {
    'cors': 'This URL doesn\'t allow access to third party applications. Please try another URL.',
    'upload': 'There was an unexpected error while uploading your file.',
    'delete': 'Your file could not be deleted. Please try again later.'
}
