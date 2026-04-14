import { useState } from 'react';
import SearchBar from './components/SearchBar';
import AlbumResults from './components/AlbumResults';
import PdfGenerator from './components/PdfGenerator';
import { searchAlbums } from './utils/musicbrainzApi';
import './App.css';

function App() {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    setIsLoading(true);
    setError(null);
    setSelectedAlbum(null);

    try {
      const results = await searchAlbums(query);
      setAlbums(results);
      if (results.length === 0) {
        setError('No albums found. Try a different search term.');
      }
    } catch (err) {
      setError('Failed to search albums. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAlbum = (album) => {
    setSelectedAlbum(album);
  };

  return (
    <div className="app">
      <header>
        <h1>CD Cover Maker</h1>
        <p className="subtitle">
          Search for album artwork and create printable CD sleeves
        </p>
      </header>

      <main>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && <p className="error">{error}</p>}

        <div className="content-layout">
          <AlbumResults
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={handleSelectAlbum}
          />

          {selectedAlbum && <PdfGenerator album={selectedAlbum} />}
        </div>
      </main>

      <footer>
        <p>Album data provided by MusicBrainz</p>
      </footer>
    </div>
  );
}

export default App;
