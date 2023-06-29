import DytePlugin from '@dytesdk/plugin-sdk';
import React, { useEffect, useState } from 'react'

const MainContext = React.createContext<any>({});

const MainProvider = ({ children }: { children: any }) => {
    const [base, setBase] = useState<string>('');
    const [userId, setUserId] = useState<string>('');
    const [plugin, setPlugin] = useState<DytePlugin>();
    const [doc, updateDocument] = useState<string>();
    const [currentPage, updateCurrentPage] = useState<number>(0);
    const [data, updateData] = useState<{[key: number]: string}>({});
    
    const setDocument = async (url: string) => {
        if (plugin) {
            await plugin.stores.get('doc').set('url', url);
            updateDocument(url)
        }
    }
    const setCurrentPage = async (page: number) => {
        await setData();
        if (plugin) {
            await plugin.stores.get('doc').set('page', page);
            updateCurrentPage(page);
        }
    };
    const setData = async () => {
        const svg = document.getElementById('svg');
        if (!svg) return;
        if (plugin) {
            await plugin.stores.get('doc').set('annotations', { ...data, [currentPage]: svg.innerHTML });
            updateData({ ...data, [currentPage]: svg.innerHTML });
        }
    }


    const loadPlugin = async () => {
        // initialize the SDK
        const dytePlugin = DytePlugin.init();

        // fetch data for a store
        await dytePlugin.stores.populate('doc');

        // define constants used across the app
        const id = await dytePlugin.room.getID();
        const userId = await dytePlugin.room.getPeer();
        setBase(id.payload.roomName);
        setUserId(userId.payload.peer.id);

        // subscribe to store
        const store = dytePlugin.stores.create('doc');
        store.subscribe('url', ({ url }) => {
            updateDocument(url);
        });
        store.subscribe('page', ({ page }) => {
            updateCurrentPage(page);
        });
        store.subscribe('annotations', ({ annotations }) => {
            updateData(annotations);
        });

        // load initial data
        const currUrl = store.get('url');
        const currPage = store.get('page');
        const currAnnotations = store.get('annotations');
        if (currUrl) updateDocument(currUrl);
        if (currPage) updateCurrentPage(currPage);
        if (currAnnotations) updateData(currAnnotations);
        setPlugin(dytePlugin);
    }

    useEffect(() => {
        loadPlugin();
        return () => {
            if (!plugin) return;
            plugin.removeListeners('remote-erase-all');
            plugin.removeListeners('remote-el');
            plugin.removeListeners('remote-erase');
        }
    }, [])

    return (
        <MainContext.Provider value={{ data, base, userId, plugin, doc, currentPage, setDocument, setCurrentPage }}>
            {children}
        </MainContext.Provider>
    )
}

export { MainContext, MainProvider } 