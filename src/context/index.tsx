import DytePlugin, { DyteStore } from '@dytesdk/plugin-sdk';
import React, { useEffect, useState } from 'react'
import { API_BASE, Extension, LocalData, Tools, colors } from '../utils/constants';
import { getRemoteUrl, urlValidator } from '../utils/files';

const MainContext = React.createContext<any>({});

const MainProvider = ({ children }: { children: any }) => {
    const [user, setUser] = useState<any>();
    const [base, setBase] = useState<string>();
    const [token, setToken] = useState<string>();
    const [svg, updateSVG] = useState<string>('');
    const [page, updatePage] = useState<number>(1);
    const [hostId, setHostId] = useState<string>('');
    const [plugin, setPlugin] = useState<DytePlugin>();
    const [annStore, setAnnStore] = useState<DyteStore>();
    const [loading, setLoading] = useState<boolean>(false);
    const [recorder, setRecorder] = useState<boolean>(false);
    const [activeTool, setActiveTool] = useState<Tools>('cursor');
    const [doc, updateDoc] = useState<{url: String, type: Extension}>();
    const [activeColor, setActiveColor] = useState<typeof colors[number]>('purple');

    const setData = async (val: Pick<LocalData, 'url' | 'type'>) => {
        if (!plugin) return;
        if (!val) setSVG('');
        const DocumentStore = plugin.stores.get('doc');
        await DocumentStore.set('document', val);
        updateDoc(val);
    }

    const setPage = async (page: number) => {
        if (!plugin) return;
        const DocumentStore = plugin.stores.get('doc');
        await DocumentStore.set('page', page);
        updatePage(page);
    }

    const setSVG = async (svg: string) => {
        if (!plugin) return;
        const DocumentStore = plugin.stores.get('doc');
        await DocumentStore.set('svg', svg);
    }
    
    const handleKeyPress = async (code: number) => {
        if (!plugin) return;
        plugin.emit('remote-keypress', { code });   
    } 

    useEffect(() => {
        if (!page || !plugin) return;
        loadAnnotation(page, plugin);
    }, [page, plugin])

    // populate annotation store
    const loadAnnotation = async (page: number, dytePlugin: DytePlugin) => {
        annStore?.unsubscribe('*');
        await dytePlugin.stores.populate(`annotation-page-${page}`);
        const annotationStore = dytePlugin.stores.create(`annotation-page-${page}`) as DyteStore;
        setAnnStore(annotationStore);
    };

    const loadPlugin = async () => {
        const dytePlugin =  DytePlugin.init({ ready: false });
        const { payload: { roomName }} = await dytePlugin.room.getID();
        const { payload: { enabledBy }} = await dytePlugin.enabledBy();
        const { payload: { peer }} = await dytePlugin.room.getPeer();
        
        // fetch & store metadata for app
        setUser(peer);
        setBase(roomName);
        setHostId(enabledBy);    
        setToken(dytePlugin.authToken);
        
        const isRecorder = peer.isRecorder || peer.isHidden;
        setRecorder(isRecorder);

        // populate store
        await dytePlugin.stores.populate('doc');
        const DocumentStore = dytePlugin.stores.create('doc');

        // set inital store data
        const currentDoc = DocumentStore.get('document');
        const currentPage = DocumentStore.get('page');
        const currentSVG = DocumentStore.get('svg');
        console.log('IMP: ', currentSVG);
        if (currentSVG) updateSVG(currentSVG);
        if (currentDoc?.url) updateDoc(currentDoc);
        if (currentPage) updatePage(currentPage);


        // subscribe to data change
        DocumentStore.subscribe('document', ({document}) => {
            if (!document.url) {
                setLoading(false);
                updateDoc(undefined);
                setAnnStore(undefined);
            }
            else updateDoc(document);
        });
        DocumentStore.subscribe('page', ({ page: p }: { page: number }) => {
            updatePage(p);
        });

        // listen to events
        dytePlugin.on('remote-keypress', ({ code }: { code: number }) => {
            const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
            iframe?.contentWindow?.postMessage({ event: 'keydown-remote', code }, '*');
        })

        // populate from config
        dytePlugin.room.on('config', async (data) => {
        
            const {followId, document: doc } = data.payload;
            setHostId(followId);
            const { url, type, metadata, google, ID} = await urlValidator(doc);
            setLoading(true);
            
            
            // update plugin store if you are the host
            if (enabledBy !== peer.id) return;

            let serverUrl = url;
            if (type !== 'googleslides') {
                serverUrl = await getRemoteUrl({type, url, google, metadata, ID }, roomName, dytePlugin.authToken);
            }
            if (type === 'googleslides') {
                serverUrl = `${API_BASE}/google-slides/${ID}`
            }
            const document = { type, url: serverUrl };
            setLoading(false);
            const DocumentStore = dytePlugin.stores.get('doc');
            await DocumentStore.set('document', document);
            updateDoc(document);
            await DocumentStore.set('page', 1);
            updatePage(1);
        });
        dytePlugin.ready();
        setPlugin(dytePlugin);
    }

    useEffect(() => {
        loadPlugin();
    }, [])


    return (
        <MainContext.Provider value={{
            svg,
            doc,
            base,
            user,
            page,
            token,
            plugin,
            hostId,
            loading, 
            recorder,
            annStore,
            activeTool,
            activeColor,
            setSVG,
            setData,
            setPage,
            setLoading,
            setAnnStore,
            setActiveTool,
            setActiveColor,
            handleKeyPress,
        }}>
            {children}
        </MainContext.Provider>
    )
}

export { MainContext, MainProvider } 
