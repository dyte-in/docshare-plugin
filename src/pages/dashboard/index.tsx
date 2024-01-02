import './style.css';

import {
    getRemoteUrl,
    urlValidator,
    getFileExtension,
    fetchRecentFiles,
    fetchRecentDriveFiles,
    setLocalStorage,
    uploadToServer,
    genName,
    formatFileName,
    getFileSize,
    delLocalStorage,
} from '../../utils/files';

import Container from "../container";
import Icon from '../../components/icon';
import File from '../../components/file';
import Input from '../../components/input';
import Button from '../../components/button';

import logo from '../../assets/logo.png';
import logoMin from '../../assets/logo-min.png';

import { MainContext } from '../../context';
import {
    API_BASE,
    API_KEY,
    CLIENT_ID,
    Extension,
    LocalData,
    allowedMimeTypes,
    driveViews,
    errorCodes,
    excelRegex,
    pluginEvents,
} from '../../utils/constants';

import useDrivePicker from 'react-google-drive-picker';
import { useContext, useEffect, useState } from 'react';
import ErrorModal from '../../components/error';
import axios from 'axios';
import DytePlugin from '@dytesdk/plugin-sdk';

const Dashboard = () => {
    const [files, setFiles] = useState<any>([]);
    const [input, setInput] = useState<string>('');
    const [driveFiles, setDriveFiles] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<keyof typeof errorCodes | undefined>();

    const {
        base,
        token,
        setData,
        plugin
    }: {
        base: string;
        token: string;
        setData: any;
        plugin: DytePlugin
    } = useContext(MainContext);
    const [openPicker] = useDrivePicker();  
   
    const uploadFile = async () => {
        if (!input) return;
        setLoading(true);
        try {
        const { url, type, metadata, google } = await urlValidator(input);
        let serverUrl = url;
        if (type !== 'googleslides') {
            serverUrl = await getRemoteUrl({type, url, google, metadata }, base, token);
        }
        if (google) {
            setLocalStorage({ url: serverUrl, type, metadata })
        }
        setData({ type, url: serverUrl });
        setLoading(false);
        setInput('');
        } catch (e: any) {
            handleError(e);
        }
    };

    const browseFile = () => {
        if (loading) return;
        const file = document.createElement('input')
        file.type = 'file';
        file.accept = '.doc,.docx,.ppt,.pptx,.txt,.pdf';
        file.click();
        file.onchange = async ({ target}: { target: any }) => {
            try {
                setLoading(true);
                const formData = new FormData();
                const file: Blob = target.files[0];
                formData.append('file', file, `${base}-${file.name ?? genName()}`);
                const url = await uploadToServer(formData, token);
                setData({ type: getFileExtension(file.type), url });
                setLoading(false);
            } catch (e: any) {
                handleError(e);
            }
        }
    };

    const onFileDrop = async (e: any) => {
        try {
            if (loading) return;
            setLoading(true);
            e.preventDefault();
            const formData = new FormData();
            const file = e.dataTransfer.files[0];
            const name = `${base}-${file.name ?? genName()}`

            console.log(file.type);
            if (!allowedMimeTypes.includes(file.type)) {
                console.log(file.type);
                throw new Error('002');
            } 
            formData.append('file', file, name);
            const url = await uploadToServer(formData, token);
            setData({ type: getFileExtension(file.type), url });
            setLoading(false);
        } catch (e: any) {
            handleError(e);
        }
    }

    const handleError = (e: any) => {
        setInput('');
        setLoading(false);
        setError(e.message);
    }

    const dismissError = () => {
        setError(undefined);
    }

    const uploadFromDrive = () => {
        if (loading) return;
        openPicker({
            clientId: CLIENT_ID,
            developerKey: API_KEY,
            showUploadView: false,
            customViews: driveViews,
            viewId: 'DOCUMENTS',
            showUploadFolders: true,
            // TODO: get from env variables
            setOrigin: 'https://app.devel.dyte.io',
            supportDrives: true,
            callbackFunction: async (data) => {
                try {
                    if (data.action === 'cancel') {
                        setLoading(false);
                        return;
                    }

                    if (data.action === 'picked') {
                        setLoading(true);
                        const doc = data.docs[0];
                        let serverUrl = doc.url;
                        const type = getFileExtension(doc.mimeType);
                        const metadata = {
                            name: doc.name,
                            mimeType: doc.mimeType,
                            id: doc.id,
                            kind: 'drive',
                            size: doc.sizeBytes,
                        }
                        if (!doc.isShared) {
                            throw new Error('003');
                        }
                    
                        if (type !== 'googleslides') {
                            serverUrl = await getRemoteUrl({
                                url: serverUrl,
                                type,
                                metadata,
                                google: true
                            }, base, token)
                        }
                        setLocalStorage({ url: serverUrl, type, metadata });
                        setData({ url: serverUrl, type })
                    }
                    setLoading(false);
                } catch (e: any) {
                   handleError(e);
                }
            },
        })
    };

    const loadFiles = async () => {
        const driveDocs = fetchRecentDriveFiles();
        let docs = await fetchRecentFiles(base);
        docs = docs.reduce((filtered: {name: string, size: number, url: string}[], el: string) => {
            if (el.includes('google-')) return filtered;
            filtered.push({
                name: el,
                url: `${API_BASE}/file/${el}`,
                size: getFileSize(el),
            })
            return filtered;
        }, []);

        setFiles(docs);
        setDriveFiles(driveDocs);
    }

    const deleteFile = async (url: string, google = false, remote = false) => {
        const name = url.replace(`${API_BASE}/file/`, '');
        if (!remote && (!google || (google && url.includes('google-')))) {
            await axios.delete(`${import.meta.env.VITE_API_BASE}/file/${name}`, {
                headers: {"Authorization": `Bearer ${token}`},
            });
        } 
        if (google) {
            delLocalStorage(url);
            setDriveFiles([...driveFiles.filter((f: LocalData) =>f.url !== url)]);
        } else {
            setFiles([...files.filter((f: { name: string }) => f.name !== name)])
        }
        if (!remote) plugin.emit(pluginEvents.DELETE_FILE, {url, google});
    }

    const openFile = (url: string, type: Extension) => {
        setData({ url, type })
    }

    useEffect(() => {
        loadFiles();
    }, [])

    useEffect(() => {
        if (!plugin) return;
        plugin.on(
            pluginEvents.DELETE_FILE,
            ({ url, google }: { url: string; google: boolean}) => deleteFile(url, google, true),
        );

        return () => {
            plugin.removeListeners(pluginEvents.DELETE_FILE);
        }
    }, [files, plugin])

    return (
        <Container className="dashboard">
            {
                error && <ErrorModal code={error} onDismiss={dismissError} />
            }
            <div className="dashboard-header">
                <img
                    src={logo}
                    alt='docshare'
                    className='dashboard-logo'
                />
                <img
                    src={logoMin}
                    alt='docshare'
                    className='dashboard-logo-min'
                />
                <Input
                    placeholder='Link to a public google document or your own document.'
                    onChange={setInput}
                    value={input}
                    disabled={loading}
                />
                <div className='dashboard-header-buttons'>
                    <Button
                        label='Upload'
                        icon='arrow_upload'
                        iconMode='sm'
                        variant='primary'
                        onClick={uploadFile}
                        disabled={loading}
                    />
                    <Button
                        label='Load from Drive'
                        icon='drive'
                        variant='secondary'
                        onClick={uploadFromDrive}
                        disabled={loading}
                    />
                </div>
            </div>
            <div
                className={`dashboard-dropbox ${loading ? 'dashboard-dropbox-disabled' : ''}`}
                onDragOver={(e) => {e.preventDefault()}}
                onDrop={onFileDrop}
            >
                <h3>Share docs & collaborate <br/> with ease</h3>
                <Icon
                    icon='upload'
                    className='dashboard-dropbox-icon'
                />
                <div className="dashboard-dropbox-text">
                    Drop files,<a onClick={browseFile}>Browse</a> or <a onClick={uploadFromDrive}>Upload from Drive</a>
                </div>
                <p>Maximum file size 50 MB. Supports: PPT, DOC, PDF</p>
            </div>
            <div className="dashboard-list">
                {loading && <File label='Loading...' size={0} variant='loading' />}
                {
                    driveFiles?.length
                    ? <>
                        <h3>Recents from Drive</h3>
                        {
                            driveFiles.map((f: LocalData) => (
                                <File
                                key={f.metadata?.id}
                                label={f.metadata?.name ?? ''}
                                size={f.metadata?.size ?? 0}
                                onClick={() => openFile(f.url, f.type)}
                                onDelete={() => deleteFile(f.url ?? '', true)} />
                            ))
                        }
                       
                    </>
                    : null
                }
                <h3>Recent Uploads</h3>
                {
                    files?.length
                    ? 
                        files.map((f: any) => (
                            <File
                            key={f.name}
                            label={formatFileName(f.name, base)}
                            size={f.size}
                            onClick={() => openFile(f.url, 'file')}
                            onDelete={() => deleteFile(f.name)} />
                        ))
                    
                    : <p>No files found. Files are retained only for the duration of the session.</p>
                } 
            </div>
        </Container>
    )
}

export default Dashboard