import DytePlugin, { DyteStore } from '@dytesdk/plugin-sdk';
import React, { useEffect, useRef, useState } from 'react'
import { API_BASE, Extension, LocalData, Tools, colors, googleID } from '../utils/constants';
import { getRemoteUrl, urlValidator } from '../utils/files';

const MainContext = React.createContext<any>({});

const MainProvider = ({ children }: { children: any }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [user, setUser] = useState<any>();
    const [base, setBase] = useState<string>();
    const [token, setToken] = useState<string>();
    const [page, updatePage] = useState<number>(1);
    const [hostId, setHostId] = useState<string>('');
    const [plugin, setPlugin] = useState<DytePlugin>();
    const [annStore, setAnnStore] = useState<DyteStore>();
    const [loading, setLoading] = useState<boolean>(false);
    const [recorder, setRecorder] = useState<boolean>(false);
    const [activeTool, setActiveTool] = useState<Tools>('cursor');
    const [updating, setUpdating] = useState<boolean>(false);
    const [actions, setActions] = useState<number[]>([]);
    const [pages, setPages] = useState<number>(1);
    const [ initialPage, setInitialPage] = useState<number>(1);
    const [doc, updateDoc] = useState<{url: String, type: Extension}>();
    const [activeColor, setActiveColor] = useState<typeof colors[number]>('purple');

    const setData = async (val: Pick<LocalData, 'url' | 'type'>) => {
        if (!plugin) return;
        const DocumentStore = plugin.stores.get('doc');
        await DocumentStore.set('document', val);
        updateDoc(val);
    }

    const setPage = async (curr: number, old: number = 1) => {
        if (!plugin) return;
        if (doc?.type === 'googleslides') {
            let oldPage = old.toString();
            const KeyStore = plugin.stores.get('keys');
            if (curr > old) {
                const data = KeyStore.get(oldPage);
                const popped = data?.pop();
                if (popped) {
                    KeyStore.set(oldPage, data);    
                }
            } if (curr < old) {
                KeyStore.set(oldPage, []);
            }
        }
        const DocumentStore = plugin.stores.get('doc');
        await DocumentStore.set('page', curr);
        plugin.room.emitEvent('page-changed', { page: curr,  presentationId: doc?.url.match(googleID)?.[0] });
        updatePage(curr);
    }
    
    const handleKeyPress = async (code: number) => {
        if (!plugin) return;
        plugin.emit('remote-keypress', { code });   
    } 

    const setKeys = async (code: number) => {
        if (!plugin) return;
        const KeyStore = plugin.stores.get('keys');
        const pageNum = page.toString();
        const val = KeyStore.get(pageNum);
        const length = val?.length ?? 1;
        if (code === 37 && (!val || !val?.length)) return;
        if (code === 39) {
            if (val && val[length - 1] === 37 && val[length-2] !== 37) {
                val?.pop();
                await KeyStore.set(pageNum, val);
                return;
            }
        }
        await KeyStore.update(pageNum, [code]) 
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
        await dytePlugin.stores.populate('keys');
        const DocumentStore = dytePlugin.stores.create('doc');
        let KeyStore = dytePlugin.stores.create('keys');

        // set inital store data
        const currentDoc = DocumentStore.get('document');
        const currentPage = DocumentStore.get('page');
        const currentKeys = KeyStore.getAll();
        if (currentDoc?.url) updateDoc(currentDoc);
        if (currentPage){
            updatePage(currentPage);
            setInitialPage(currentPage);
        }
        if (Object.keys(currentKeys).length > 0) {
            setActions(currentKeys[currentPage]);
        }

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
            dytePlugin.room.emitEvent('page-changed', { page: p, presentationId: doc?.url.match(googleID)?.[0] });
        });

        // listen to events
        dytePlugin.on('remote-keypress', ({ code }: { code: number }) => {
            const iframe = document.getElementById('slides-viewer') as HTMLIFrameElement;
            iframe?.contentWindow?.postMessage({ event: 'keydown-remote', code }, '*');
        })

        // populate from config
        dytePlugin.room.on('config', async function (data) {
            setLoading(true);
            updateDoc(undefined);
            // cleanup
            if (enabledBy === peer.id) {
                const KeyStore = dytePlugin.stores.get('keys');
                for(let i = 1; i <= pages; i++) {
                    try {
                      await dytePlugin.stores.delete(`annotation-page-${i}`);
                      KeyStore.delete(i.toString());
                    } catch (e) {};
                };
            }
            if (svgRef.current) svgRef.current.innerHTML = '';
            setPages(1);
            setAnnStore(undefined);
            // set config
            const {followId, document: doc, page: pageNum } = data.payload;
            const {
                url,
                type,
                metadata,
                google,
                ID,
            } = await urlValidator(doc);
            setHostId(followId);
            let serverUrl = url;
            if (type !== 'googleslides') {
                serverUrl = await getRemoteUrl({type, url, google, metadata, ID }, roomName, dytePlugin.authToken);
            }
            if (type === 'googleslides') {
                serverUrl = `${API_BASE}/google-slides/${ID}`;
            }
            const document = { type, url: serverUrl };
            updatePage(pageNum ?? 1);
            setInitialPage(pageNum ?? 1);
            setLoading(false);

            // update plugin store if you are the host
            if (enabledBy === peer.id) {
                const DocumentStore = dytePlugin.stores.get('doc');
                await DocumentStore.set('document', document);
                await DocumentStore.set('page', pageNum ?? 1);
            };
            updateDoc(document);
        });

        dytePlugin.room.on('skip-to-page', async (data) => {
            const { page: pageNum } = data;
            setUpdating(true);
            setInitialPage(pageNum);
            updatePage(pageNum);
            if (enabledBy === peer.id) {
                const DocumentStore = dytePlugin.stores.get('doc');
                await DocumentStore.set('page', pageNum ?? 1);
            }
        })
        dytePlugin.ready();
        setPlugin(dytePlugin);
    }

    useEffect(() => {
        loadPlugin();
    }, [])

    return (
        <MainContext.Provider value={{
            svgRef,
            doc,
            base,
            user,
            pages,
            page,
            token,
            plugin,
            actions,
            hostId,
            loading, 
            recorder,
            annStore,
            activeTool,
            initialPage,
            activeColor,
            updating,
            setUpdating,
            setActions,
            setPages,
            setKeys,
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
