import { ToolData } from "./types";

export const options = {
    cMapUrl: 'cmaps/',
    standardFontDataUrl: 'standard_fonts/',
};

export const colors = ['pink', 'red', 'orange', 'blue', 'yellow', 'black', 'white', 'grey', 'purple', 'peach', 'green', 'olive'];

export const tools: ToolData[] = [
    {icon: 'cursor', tool: 'drawing-tool-cursor'},
    {icon: 'draw', tool: 'drawing-tool-pencil'},
    {icon: 'highlight', tool: 'drawing-tool-highlight'},
    {icon: 'shape', tool: 'drawing-tool-shape'},
    {icon: 'text', tool: 'drawing-tool-text'},
    {icon: 'eraser', tool: 'drawing-tool-erase'},
    {icon: 'eraseAll', tool: 'drawing-tool-erase-all'},
    {icon: 'download', tool: 'export-tool'},
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
