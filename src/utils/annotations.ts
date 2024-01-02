// coordinates
export const getClientCoords = (e: any) => {
    var touch = e.touches[0];
    var cx = touch.clientX;
    var cy = touch.clientY;
    return {
        clientX: cx, clientY: cy
    }
}
export const getCoords = (
    svg: SVGSVGElement | null,
    x: number,
    y: number, 
    ref: React.RefObject<HTMLCanvasElement>
) => {
    if (!svg) return { x: 0, y: 0};
    const rect = svg.getBoundingClientRect();
    const xPos = getX(ref, x - rect.x);
    const yPos = getY(ref, y - rect.y);
    return {x: xPos, y: yPos};
}
const getX = (ref: React.RefObject<HTMLCanvasElement>, x: number) => {
    const el = ref.current;
    if (!el || x < 0) return 0;
    return Math.min(x, el.clientWidth);
}
const getY = (ref: React.RefObject<HTMLCanvasElement>, y: number) => {
    const el = ref.current;
    if (!el || y < 0) return 0;
    return Math.min(y, el.clientHeight);
}
export const color = (activeColor: string): string => {
    switch(activeColor) {
        case 'pink':
        return '#f1cbff';
        case 'red':
        return '#dc2626';
        case 'orange':
        return '#FFA071';
        case 'blue':
        return '#c8e5ff';
        case 'yellow':
        return '#FEDD9E';
        case 'white':
        return '#eee';
        case 'grey':
        return '#6b7280';
        case 'purple':
        return '#c9c9ff';
        case 'peach':
        return '#ffbdbd';
        case 'green':
        return '#e1f7d5';
        case 'olive':
        return '#778A35';
        default:
        return '#000000';
    }
}