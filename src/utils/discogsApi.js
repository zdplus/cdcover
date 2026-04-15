const DISCOGS_API = 'https://api.discogs.com';
const DISCOGS_TOKEN = 'aZfCezgPPSuDVgeyKqUEsHJqHSrTgRtnphuZSTgV';

// Get all available artwork from Discogs (back cover, spine, etc.)
export async function getDiscogsArtwork(albumName, artistName) {
  try {
    const query = encodeURIComponent(`${artistName} ${albumName}`);
    const searchUrl = `${DISCOGS_API}/database/search?q=${query}&type=release&per_page=5&token=${DISCOGS_TOKEN}`;

    console.log('Searching Discogs for artwork:', albumName, artistName);
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    if (!searchData.results || searchData.results.length === 0) return null;

    const releaseId = searchData.results[0].id;
    const releaseUrl = `${DISCOGS_API}/releases/${releaseId}?token=${DISCOGS_TOKEN}`;

    const releaseResponse = await fetch(releaseUrl);
    if (!releaseResponse.ok) return null;

    const releaseData = await releaseResponse.json();

    if (!releaseData.images || releaseData.images.length < 2) return null;

    const result = { back: null, spine: null };
    const secondaryImages = releaseData.images.filter(img => img.type === 'secondary');

    for (const img of secondaryImages) {
      const aspectRatio = img.width / img.height;

      // Spine images are very elongated - either narrow (< 0.3) or wide (> 3)
      if ((aspectRatio < 0.3 || aspectRatio > 3) && !result.spine) {
        result.spine = proxyUrl(img.uri);
        result.spineRotated = aspectRatio > 3; // needs 90° rotation if wide
        console.log('Found spine image:', img.width, 'x', img.height, 'rotated:', aspectRatio > 3);
      }
      // Back cover is usually square-ish (aspect ratio 0.7 - 1.4)
      else if (aspectRatio > 0.7 && aspectRatio < 1.4 && !result.back) {
        result.back = proxyUrl(img.uri);
        console.log('Found back image:', img.width, 'x', img.height);
      }

      if (result.back && result.spine) break;
    }

    // Fallback: use first secondary as back if none found
    if (!result.back && secondaryImages.length > 0) {
      result.back = proxyUrl(secondaryImages[0].uri);
    }

    return result;
  } catch (error) {
    console.error('Discogs API error:', error);
    return null;
  }
}

function proxyUrl(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.replace('https://i.discogs.com', '/discogs-img');
}

export async function getBackArtwork(albumName, artistName) {
  try {
    // Search for the release
    const query = encodeURIComponent(`${artistName} ${albumName}`);
    const searchUrl = `${DISCOGS_API}/database/search?q=${query}&type=release&per_page=5&token=${DISCOGS_TOKEN}`;

    console.log('Searching Discogs for back art:', albumName, artistName);
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.log('Discogs search failed:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();
    if (!searchData.results || searchData.results.length === 0) {
      console.log('No Discogs results found');
      return null;
    }

    // Get the first result's details
    const releaseId = searchData.results[0].id;
    const releaseUrl = `${DISCOGS_API}/releases/${releaseId}?token=${DISCOGS_TOKEN}`;

    console.log('Fetching Discogs release:', releaseId);
    const releaseResponse = await fetch(releaseUrl);
    if (!releaseResponse.ok) {
      console.log('Discogs release fetch failed:', releaseResponse.status);
      return null;
    }

    const releaseData = await releaseResponse.json();

    // Find back cover image (type: "secondary" often includes back)
    if (releaseData.images && releaseData.images.length > 1) {
      // First image is usually front, second is often back
      const backImage = releaseData.images.find(img => img.type === 'secondary')
        || releaseData.images[1];
      const imageUrl = backImage?.uri;
      if (imageUrl) {
        // Route through Vite's dev server proxy to bypass CORS
        // Discogs URLs look like: https://i.discogs.com/xxxxx/image.jpeg
        const proxiedUrl = imageUrl.replace('https://i.discogs.com', '/discogs-img');
        console.log('Found Discogs back image (proxied):', proxiedUrl);
        return proxiedUrl;
      }
      return null;
    }

    console.log('No secondary images found');
    return null;
  } catch (error) {
    console.error('Discogs API error:', error);
    return null;
  }
}
