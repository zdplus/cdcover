import AlbumCard from './AlbumCard';

export default function AlbumResults({ albums, selectedAlbum, onSelectAlbum }) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <div className="album-results">
      <h2>Search Results</h2>
      <p className="results-hint">Click an album to select it for PDF generation</p>
      <div className="album-grid">
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onSelect={onSelectAlbum}
            isSelected={selectedAlbum?.id === album.id}
          />
        ))}
      </div>
    </div>
  );
}
