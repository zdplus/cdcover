import { useState } from 'react';
import { getAlbumTracks } from '../utils/musicbrainzApi';

export default function AlbumCard({ album, onSelect, isSelected }) {
  const [imgError, setImgError] = useState(false);
  const [tracks, setTracks] = useState(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showTracks, setShowTracks] = useState(false);

  const handleMouseEnter = async () => {
    setShowTracks(true);
    if (tracks === null && !isLoadingTracks) {
      setIsLoadingTracks(true);
      try {
        const fetchedTracks = await getAlbumTracks(album.id);
        setTracks(fetchedTracks);
      } catch (err) {
        console.error('Failed to fetch tracks:', err);
        setTracks([]);
      } finally {
        setIsLoadingTracks(false);
      }
    }
  };

  const handleMouseLeave = () => {
    setShowTracks(false);
  };

  return (
    <div
      className={`album-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(album)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {imgError ? (
        <div className="album-artwork album-artwork-placeholder">
          <span>No Cover</span>
        </div>
      ) : (
        <img
          src={album.artworkUrlSmall}
          alt={`${album.name} cover`}
          className="album-artwork"
          onError={() => setImgError(true)}
        />
      )}
      <div className="album-info">
        <h3 className="album-name">{album.name}</h3>
        <p className="album-artist">{album.artist}</p>
      </div>

      {showTracks && (
        <div className="track-tooltip">
          {isLoadingTracks ? (
            <span className="loading">Loading tracks...</span>
          ) : tracks && tracks.length > 0 ? (
            <ul>
              {tracks.slice(0, 20).map((track) => (
                <li key={track.number}>
                  {track.number}. {track.name}
                  {track.duration && <span className="duration">{track.duration}</span>}
                </li>
              ))}
              {tracks.length > 20 && <li className="more">+{tracks.length - 20} more</li>}
            </ul>
          ) : (
            <span className="no-tracks">No track info available</span>
          )}
        </div>
      )}
    </div>
  );
}
