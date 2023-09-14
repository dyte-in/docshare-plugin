import DytePlugin, { DyteStore } from '@dytesdk/plugin-sdk';
import React, { useEffect, useState } from 'react'

const MainContext = React.createContext<any>({});

const MainProvider = ({ children }: { children: any }) => {
    const [base, setBase] = useState<string>('');
    const [userId, setUserId] = useState<string>('');
    const [plugin, setPlugin] = useState<DytePlugin>();
    const [doc, updateDocument] = useState<string>();
    const [annStore, setAnnStore] = useState<DyteStore>();
    const [currentPage, updateCurrentPage] = useState<number>(0);
    const [isRecorder, setIsRecorder] = useState<boolean>(false);
    const [followId, setFollowId] = useState<string>('');
    
    const setDocument = async (url: string) => {
        if (plugin) {
            await plugin.stores.get('doc').set('url', url);
            updateDocument(url)
        }
    }
    const setCurrentPage = async (page: number) => {
        if (plugin) {
            updateCurrentPage(page);
            await plugin.stores.get('doc').set('page', page);
        }
    };

    useEffect(() => {
        if (!currentPage || !plugin) return;
        loadAnnotation(currentPage, plugin);
    }, [currentPage, plugin])

    // populate annotation store
    const loadAnnotation = async (page: number, dytePlugin: DytePlugin) => {
        annStore?.unsubscribe('*');
        await dytePlugin.stores.populate(`annotation-page-${page}`);
        const annotationStore = dytePlugin.stores.create(`annotation-page-${page}`) as DyteStore;
        setAnnStore(annotationStore);
    };

    const loadPlugin = async () => {
        // initialize the SDK
        const dytePlugin = DytePlugin.init({ ready: false });

        // fetch data for a store
        await dytePlugin.stores.populate('doc');
        const DocumentStore = dytePlugin.stores.create('doc');

        // define constants used across the app
        const id = await dytePlugin.room.getID();
        const userId = await dytePlugin.room.getPeer();
        const isRec = userId.payload.peer.isRecorder || userId.payload.peer.isHidden;
        setBase(id.payload.roomName);
        setUserId(userId.payload.peer.userId);
        setIsRecorder(isRec);

        // subscribe to store    
        DocumentStore.subscribe('url', ({ url }) => {
            updateDocument(url);
        });
        DocumentStore.subscribe('page', ({ page }) => {
            updateCurrentPage(page);
        });

        // set followId
        dytePlugin.room.on('config', ({ payload }) => {
            setFollowId(payload.followId)
        });

        // load initial data
        const currUrl = DocumentStore.get('url');
        const currPage = DocumentStore.get('page');
        if (currUrl) updateDocument(currUrl);
        if (currPage) updateCurrentPage(currPage);
        setPlugin(dytePlugin);
        dytePlugin.ready();
    }

    useEffect(() => {
        loadPlugin();
        return () => {
            if (!plugin) return;
            plugin.removeListeners('remote-erase-all');
            plugin.removeListeners('remote-erase');
        }
    }, [])

    return (
        <MainContext.Provider value={{ followId, isRecorder, annStore, base, userId, plugin, doc, currentPage, setAnnStore, setDocument, setCurrentPage }}>
            {children}
        </MainContext.Provider>
    )
}

export { MainContext, MainProvider } 