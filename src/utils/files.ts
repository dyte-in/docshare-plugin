import axios from "axios";
import { resetContorller } from "./axios";
import {
    Extension,
    API_KEY,
    API_BASE,
    LocalData,
    LOCAL_STORAGE,
    googleID,
    allowedMimeTypes,
    DRIVE_API_BASE,
} from "./constants";

const fetchRecentFiles = async (base: string): Promise<any[]> => {
    const result = await axios.get(`${API_BASE}/files/${base}`);
    return result.data.files ?? [];
};
const fetchRecentDriveFiles = (): Omit<LocalData, 'google'>[] => {
    const list: any[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE)?? '[]');
    return list;
};

const setLocalStorage = (
    data: Omit<LocalData, 'google'>
) => {
    let list = JSON.parse(localStorage.getItem(LOCAL_STORAGE)?? '[]');
    list = list.filter((l: LocalData) => l.url !== data.url);
    list.push(data);
    localStorage.setItem(LOCAL_STORAGE, JSON.stringify(list));
};

const delLocalStorage = (url: string) => {
    let list = JSON.parse(localStorage.getItem(LOCAL_STORAGE)?? '[]');
    list = list.filter((l: LocalData) => l.url !== url);
    localStorage.setItem(LOCAL_STORAGE, JSON.stringify(list));
}

const urlValidator = async (url: string): Promise<LocalData> => {
    let type: Extension = 'unsupported';
    let google: boolean = true;
    let metadata: any = undefined;
    let ID: string | undefined;
    if (
        url.includes('docs.google.com')
        || url.includes('drive.google.com')
    ) {
        ID = url.match(googleID)?.[0];
        if (!ID) {
            throw new Error('001');
        }
        metadata = await getDriveFile(ID);
        if (!allowedMimeTypes.includes(metadata.mimeType)) {
            throw new Error('002');
        }
        type = getFileExtension(metadata.mimeType);
    } else {
        google = false;
        type = 'file';
    }
    return { type, url, google, metadata, ID };
};

const getFileExtension = (val: string): Extension => {
    switch(val) {
        case 'text/plain':
            return 'txt';

        case 'application/pdf':
            return 'pdf';

        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'doc';

        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.oasis.opendocument.text':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            return 'ppt';

        case 'application/vnd.google-apps.document':
            return 'googledocs';

        case 'application/vnd.google-apps.presentation':
            return 'googleslides';

        default:
            return 'unsupported';
    }
}

const getDriveFile = async(id: string) => {
    try {
        const resp = await axios({
            method: 'get',
            url: `https://www.googleapis.com/drive/v3/files/${id}?key=${API_KEY}&fields=name,id,kind,mimeType,size`,
        });
        return resp.data;
    } catch (e) {
        throw new Error('003')
    }
}

const exportDriveFile = async(id: string, _export: boolean = true) => {
    if (_export) {
        return axios({
            method: 'get',
            url: `${DRIVE_API_BASE}/${id}/export?key=${API_KEY}&mimeType=application/pdf`,
            responseType: 'blob',
        })
    }
   
    return axios({
        method: 'get',
            url: `${DRIVE_API_BASE}/${id}?alt=media&key=${API_KEY}&mimeType=application/pdf`,
            responseType: 'blob',
    })
}

const genName = () => {
    return (Math.random()*10000).toFixed(0)
}

const getRemoteUrl = async (
    data: LocalData,
    base: string,
    authToken: string,
) => {
    let formData: FormData = new FormData();
    let fileName = '';
    let blob: Blob;
    try {
        if (data.google) {
            const useExport = data.url.includes('docs.google.com');
            const ID = data.url.match(googleID)?.[0] ?? '';
            const result = await exportDriveFile(ID, useExport);
            blob = result.data;
            fileName = `${base}-google-${data.metadata?.name}`;
        } else {
            const raw = await axios.get(data.url);
            const type = raw.headers["content-type"];
            blob = new Blob([raw.data]);
            if (!allowedMimeTypes.includes(type)) {
                throw new Error('002');
            }
            fileName = `${base}-${blob.name ?? genName()}`;
        }
        formData.append("file", blob, fileName);
    } catch (e) {
        throw new Error('003')
    }

    return (await uploadToServer(formData, authToken))
}

const uploadToServer = async (file: FormData, authToken: string) => {
    try {
        const result = await axios({
            method: "post",
            signal: resetContorller().signal,
            url: `${API_BASE}/docshare`,
            data: file,
            headers: {"Authorization": `Bearer ${authToken}`},
        });

        const url = `${API_BASE}/file/${result.data.link}`
        return url;
    } catch (e: any) {
        throw new Error('004');
    }
}

const formatFileName = (name: string = '', base: string) => {
    return name.replace(`${base}-`, '');
}

const getFileSize = (url: string) => {
    let fileSize: string | null;
    const http = new XMLHttpRequest();
    http.open('HEAD', `${API_BASE}/file/${url}`, false);
    http.send(null); 
    if (http.status === 200) {
        fileSize = http.getResponseHeader('content-length');
        if (!fileSize) return 0;
        return parseFloat(fileSize);
    }
    return 0;
}

export {
    genName,
    getRemoteUrl,
    getFileSize,
    formatFileName,
    urlValidator,
    uploadToServer,
    fetchRecentFiles,
    delLocalStorage,
    setLocalStorage,
    fetchRecentDriveFiles,
    getFileExtension,
}
