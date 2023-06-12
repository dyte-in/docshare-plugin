export let controller = new AbortController();

export const resetContorller = () => {
    controller = new AbortController();
    return controller;
}
