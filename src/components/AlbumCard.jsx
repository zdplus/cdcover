export default function AlbumCard({ album, onSelect, isSelected }) {
  return (
    <div
      className={`album-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(album)}
    >
      <img
        src={album.artworkUrlSmall}
        alt={`${album.name} cover`}
        className="album-artwork"
      />
      <div className="album-info">
        <h3 className="album-name">{album.name}</h3>
        <p className="album-artist">{album.artist}</p>
      </div>
    </div>
  );
}
