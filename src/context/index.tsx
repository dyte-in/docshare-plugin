import DytePlugin, { DyteStore } from '@dytesdk/plugin-sdk';
import React, { useEffect, useState } from 'react'
import { Extension, LocalData, Tools, colors } from '../utils/constants';
import { urlValidator } from '../utils/files';

const MainContext = React.createContext<any>({});

const MainProvider = ({ children }: { children: any }) => {
    const [user, setUser] = useState<any>();
    const [base, setBase] = useState<string>();
    const [token, setToken] = useState<string>();
    const [page, updatePage] = useState<number>(1);
    const [hostId, setHostId] = useState<string>('');
    const [plugin, setPlugin] = useState<DytePlugin>();
    const [activeTool, setActiveTool] = useState<Tools>('cursor');
    const [recorder, setRecorder] = useState<boolean>(false);
    const [annStore, setAnnStore] = useState<DyteStore>();
    const [doc, updateDoc] = useState<{url: String, type: Extension}>();
    const [activeColor, setActiveColor] = useState<typeof colors[number]>('purple');

    const setData = async (val: Pick<LocalData, 'url' | 'type'>) => {
        if (!plugin) return;
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
        if (currentDoc?.url) updateDoc(currentDoc);
        if (currentPage) updatePage(currentPage);


        // subscribe to data change
        DocumentStore.subscribe('document', ({document}) => {
            if (!document.url) {
                updateDoc(undefined);
                setAnnStore(undefined);
            }
            else updateDoc(document);
        });
        DocumentStore.subscribe('page', ({page}) => {
            updatePage(page);
        });

        // populate from config
        dytePlugin.room.on('config', async ({ followId, document }: { followId: string, document: string }) => {
            setHostId(followId);
            const data = await urlValidator(document);
            // update plugin store if you are the host
            if (followId === peer.id || enabledBy === peer.id) {
                setData({
                    type: data.type,
                    url: data.url,
                })
                return;
            }
            updateDoc({
                type: data.type,
                url: data.url,
            });
        });

        dytePlugin.ready();
        setPlugin(dytePlugin);
    }

    useEffect(() => {
        loadPlugin();
    }, [])

    return (
        <MainContext.Provider value={{
            doc,
            base,
            user,
            page,
            token,
            plugin,
            hostId,
            recorder,
            annStore,
            activeTool,
            activeColor,
            setData,
            setPage,
            setAnnStore,
            setActiveTool,
            setActiveColor,
        }}>
            {children}
        </MainContext.Provider>
    )
}

export { MainContext, MainProvider } 

// TODO: handle plugin events for:
// 2. page changes
// 4. annotations
// 5. deselecting docs
// 6. annotations
// 7. sync zoom and scroll for recorder/livestreamer/hidden-peers