import './dashboard.css';
import { useContext, useEffect, useState } from 'react';
import { FileInput, Header, File, ErrorModal } from '../../components'
import { MainContext } from '../../context';
import { fetchUrl, getFormData } from '../../utils/helpers';
import axios from 'axios';
import { dashboardMessages, errorMessages } from '../../utils/contants';
import { controller } from "../../utils/controller";

const Dashboard = () => {
    const { plugin, base, setDocument } = useContext(MainContext);
    const [search, setSearch] = useState<string>('');
    const [files, setFiles] = useState<string[]>([]);
    const [status, setStatus] = useState<string>(dashboardMessages.success);
    const [loadingVal, setLoadingVal] = useState<number>(0);
    const [disabled, setDisabled] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchFiles();
    }, [])

    useEffect(() => {
        plugin.on('file-delete', (data: any) => {
            setFiles([...files.filter(x => x !== data.fileName)])
        })
        return () => {
            plugin.removeListeners('file-delete');
        }
    }, [plugin])
    
    // Load remote documents
    const fetchFiles = async () => {
        try {
            const files = await axios.get(`${import.meta.env.VITE_API_BASE}/files/${base}`);
            setFiles(files.data.files);
        } catch (e) {
            setStatus(dashboardMessages.error);
        }
    };

    // Load document
    const onUpload = async () => {
        setDisabled(true);
        let blob = await axios.get(search).then(r => new Blob([r.data]));
        const {formData, fileName } = getFormData(blob, base);
        try {
            const url = await fetchUrl(formData, plugin.authToken, setLoadingVal);
            nextPage(url)
        } catch (e: any) {
            handleErrors(e, fileName);
        }
    }
    const onClick = () => {
        setDisabled(true);
        const file = document.createElement('input')
        file.type = 'file';
        file.accept = '.doc,.docx,.ppt,.pptx,.txt,.pdf';
        file.click();
        file.onchange = async ({ target}: { target: any }) => {
            const {formData, fileName } = getFormData(target.files[0], base);
            try {
                const url = await fetchUrl(formData, plugin.authToken, setLoadingVal);
                nextPage(url)
            } catch (e: any) {
                handleErrors(e, fileName);
            }
        }
    }
    const onDrop = async (e: any) => {
        setDisabled(true);
        e.preventDefault();
        let file;
        file = e.dataTransfer.files[0];
        const {formData, fileName } = getFormData(file, base);
        try {
            const url = await fetchUrl(formData, plugin.authToken);
            nextPage(url)
        } catch (e: any) {
            handleErrors(e, fileName);
        }
    }

    const handleErrors = async (e: Error, file: string = '') => {
        if (e.message === 'ERR_NETWORK') setError(errorMessages.cors)
        else if (e.message === 'ERR_CANCELED') {
            try {
                await axios.delete(`${import.meta.env.VITE_API_BASE}/file/${file}`, {
                    headers: {"Authorization": `Bearer ${plugin.authToken}`},
                });
            } catch (e) {}
            setError(''); 
        }
        else setError(errorMessages.upload)
        setSearch('');
        setLoadingVal(0);
        setDisabled(false);
    }

    // Navigate
    const nextPage = async (url: string | undefined) => {
        if (!url) return;
        setSearch(url);
        setDocument(url);
        setDisabled(false);
    }

    // Helper functions
    const updateSearch = ({ target }: { target: { value: any} }) => {
        setSearch(target?.value);
    }
    const getFileSize = (url: string) => {
        let fileSize: string | null;
        const http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send(null); 
        if (http.status === 200) {
            fileSize = http.getResponseHeader('content-length');
            if (!fileSize) return 0;
            return parseFloat(fileSize);
        }
        return 0;
    }

    // Delete
    const onDelete = async (fileName: string) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE}/file/${fileName}`, {
                headers: {"Authorization": `Bearer ${plugin.authToken}`},
            });
            plugin.emit('file-delete', { fileName });
        } catch (e: any) {
            setError(e.message === 'Network Error' ? errorMessages.cors : errorMessages.delete);
        }
    }
    const onDismiss = () => {
       controller.abort();
    }

    return (
        <div className="dashboard-container">
            {
                error && (
                <ErrorModal
                    onClose={() => {setError('')}}
                    message={error}
                />
                )
            }
            <Header
                search={search}
                updateSearch={updateSearch}
                onUpload={onUpload}
                disabled={disabled}
            />
            <FileInput
                disabled={disabled}
                onDrop={onDrop} 
                onClick={onClick}
            />
            <div className="file-container">
                <h3>Recent Uploads</h3>
                {
                    loadingVal !== 0 &&
                    <File
                    onDismiss={onDismiss}
                    label='Loading you file...'
                    size={getFileSize(search) ?? 0}
                    state={loadingVal === 100 ? 'loaded' : 'loading'}
                    loadingVal={loadingVal} />
                }
                {
                    ((!loadingVal || loadingVal === 0) && files.length < 1)
                    && <div className="empty">
                       {status}
                    </div>
                }
                {
                    files.map((f, index) => (
                        <File
                        key={index}
                        label={f.replace(`${base}-`, '')}
                        onDelete={() => onDelete(f)}
                        onClick={() => nextPage(`${import.meta.env.VITE_API_BASE}/file/${f}`)}
                        size={getFileSize(`${import.meta.env.VITE_API_BASE}/file/${f}`) ?? 0.0} 
                        />
                    ))
                }
            </div>
        </div>
    )
}

export default Dashboard
