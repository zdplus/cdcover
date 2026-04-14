const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const COVER_ART_API = 'https://coverartarchive.org';

// MusicBrainz requires a User-Agent header
const headers = {
  'Accept': 'application/json',
};

// Rate limiting - MusicBrainz allows 1 request per second
let lastRequestTime = 0;
async function rateLimitedFetch(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1100) {
    await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }
  return response.json();
}

export async function searchAlbums(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `${MUSICBRAINZ_API}/release-group?query=${encodedQuery}&type=album&fmt=json&limit=20`;

  try {
    const data = await rateLimitedFetch(url);

    const albums = await Promise.all(
      data['release-groups'].slice(0, 12).map(async (rg) => {
        const artist = rg['artist-credit']?.[0]?.name || 'Unknown Artist';

        return {
          id: rg.id,
          name: rg.title,
          artist: artist,
          artworkUrl: `${COVER_ART_API}/release-group/${rg.id}/front-1200`,
          artworkUrlSmall: `${COVER_ART_API}/release-group/${rg.id}/front-250`,
          releaseDate: rg['first-release-date'],
          source: 'musicbrainz',
        };
      })
    );

    return albums;
  } catch (error) {
    console.error('Failed to search MusicBrainz:', error);
    throw error;
  }
}

export async function getAlbumTracks(releaseGroupId) {
  try {
    // First, get releases for this release group to find one with track info
    const releasesUrl = `${MUSICBRAINZ_API}/release?release-group=${releaseGroupId}&inc=recordings&fmt=json`;
    const releasesData = await rateLimitedFetch(releasesUrl);

    if (!releasesData.releases || releasesData.releases.length === 0) {
      return [];
    }

    // Use the first release (usually the original)
    const release = releasesData.releases[0];
    const tracks = [];

    if (release.media) {
      let trackNumber = 1;
      for (const medium of release.media) {
        if (medium.tracks) {
          for (const track of medium.tracks) {
            tracks.push({
              number: trackNumber++,
              name: track.title,
              duration: formatDuration(track.length),
            });
          }
        }
      }
    }

    return tracks;
  } catch (error) {
    console.error('Failed to fetch tracks from MusicBrainz:', error);
    return [];
  }
}

function formatDuration(ms) {
  if (!ms) return '';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
