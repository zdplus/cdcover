const ITUNES_API_BASE = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP_BASE = 'https://itunes.apple.com/lookup';

// JSONP helper to avoid CORS issues with iTunes API
function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'itunes_cb_' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP request failed'));
    };

    script.src = `${url}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

export async function getAlbumTracks(albumId) {
  const params = new URLSearchParams({
    id: albumId,
    entity: 'song',
  });

  try {
    const data = await fetchJsonp(`${ITUNES_LOOKUP_BASE}?${params}`);

    const tracks = data.results
      .filter((item) => item.wrapperType === 'track')
      .map((track, index) => ({
        number: track.trackNumber || index + 1,
        name: track.trackName || 'Unknown Track',
        duration: formatDuration(track.trackTimeMillis),
      }))
      .sort((a, b) => a.number - b.number);

    return tracks;
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    return [];
  }
}

function formatDuration(ms) {
  if (!ms) return '';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export async function searchAlbums(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  const params = new URLSearchParams({
    term: query,
    media: 'music',
    entity: 'album',
    limit: 20,
  });

  try {
    const data = await fetchJsonp(`${ITUNES_API_BASE}?${params}`);

    return data.results.map((album) => ({
      id: album.collectionId,
      name: album.collectionName,
      artist: album.artistName,
      artworkUrl: getHighResArtwork(album.artworkUrl100),
      artworkUrlSmall: album.artworkUrl100,
      releaseDate: album.releaseDate,
      trackCount: album.trackCount,
    }));
  } catch (error) {
    console.error('Failed to search albums:', error);
    throw error;
  }
}

function getHighResArtwork(url) {
  if (!url) return null;
  // Replace 100x100 with 1400x1400 for print-quality resolution (300 DPI at 120mm)
  return url.replace('100x100bb', '1400x1400bb');
}
