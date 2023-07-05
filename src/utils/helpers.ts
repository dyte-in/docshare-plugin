import axios from "axios";
import { resetContorller } from "./controller";

const CancelToken = axios.CancelToken;
const source = CancelToken.source();

const throttle = (cb: any, delay: number) => {
    let previousCall = new Date().getTime();
    return function(...args: any) {
        const time = new Date().getTime();
        if (time - previousCall >= delay) {
            previousCall = time;
            cb(...args);
        }
    }
}
const color = (activeColor: string): string => {
    switch(activeColor) {
        case 'pink':
        return '#db2777';
        case 'red':
        return '#dc2626';
        case 'orange':
        return '#de843a';
        case 'blue':
        return '#0ea4e9';
        case 'yellow':
        return '#fdbb74';
        case 'white':
        return '#ffffff';
        case 'grey':
        return '#6b7280';
        case 'purple':
        return '#6365f1';
        case 'peach':
        return '#f87171';
        case 'green':
        return '#34d399';
        case 'olive':
        return '#3f6212';
        default:
        return '#000000';
    }
}
const colorRgb = (activeColor: string): string => {
    switch(activeColor) {
        case 'pink':
        return 'rgb(219,39,119)';
        case 'red':
        return 'rgb(220, 38, 38)';
        case 'orange':
        return 'rgb(222, 132, 58)';
        case 'blue':
        return 'rgb(14, 164, 233)';
        case 'yellow':
        return 'rgb(253, 187, 116)';
        case 'white':
        return 'rgb(225, 225, 225)';
        case 'grey':
        return 'rgb(107, 114, 128)';
        case 'purple':
        return 'rgb(99, 101, 241)';
        case 'peach':
        return 'rgb(248, 113, 113)';
        case 'green':
        return 'rgb(52, 211, 153)';
        case 'olive':
        return 'rgb(63, 98, 18)';
        default:
        return 'rgb(0,0,0)';
    }
}
const getFormData = (file: Blob, base: string) => {
    const formData = new FormData();
    const fileName = `${base}-${file.name ?? (Math.random()*10000).toFixed(0)}`;
    formData.append("file", file, fileName);
    return {formData, fileName: fileName };
}
const fetchUrl = async (formData: FormData, authToken: string, setLoadingVal?: any) => {
    try {
        const result = await axios({
            method: "post",
            signal: resetContorller().signal,
            url: `${import.meta.env.VITE_API_BASE}/docshare`,
            data: formData,
            headers: {"Authorization": `Bearer ${authToken}`},
            onUploadProgress: () => {
                if (setLoadingVal) setLoadingVal(60);
            }
        });
        if(result?.data?.link)
        {
            if (setLoadingVal) setLoadingVal(100);
            return `${import.meta.env.VITE_API_BASE}/file/${result.data.link}`;
        }
    } catch (e: any) {
       throw new Error(e.code);
    }
}



export { getFormData, fetchUrl, throttle, color, colorRgb }