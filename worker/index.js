export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    try {
      const asset = await env.ASSETS.fetch(url);
      
      if (asset.status === 404) {
        const indexAsset = await env.ASSETS.fetch(new URL('/index.html', url.origin));
        return new Response(indexAsset.body, {
          ...indexAsset,
          headers: {
            ...Object.fromEntries(indexAsset.headers),
            'Content-Type': 'text/html;charset=UTF-8',
          },
        });
      }
      
      return asset;
    } catch (e) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
