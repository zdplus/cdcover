import { useState, useEffect } from 'react';
import { generateCDCoverPDF, generateJewelCasePDF } from '../utils/pdfCreator';
import { getAlbumTracks } from '../utils/musicbrainzApi';

export default function PdfGenerator({ album }) {
  const [outputType, setOutputType] = useState('sleeve');
  const [paperSize, setPaperSize] = useState('letter');
  const [backCoverMode, setBackCoverMode] = useState('both');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [album.id]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch tracks for the album (may return empty array on error)
      const tracks = await getAlbumTracks(album.id);
      console.log('Tracks fetched:', tracks.length);

      if (outputType === 'jewel') {
        await generateJewelCasePDF(album, tracks, paperSize, backCoverMode);
      } else {
        await generateCDCoverPDF(album, tracks, paperSize);
      }
      console.log('PDF generated successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pdf-generator">
      <h2>Create Paper Sleeve</h2>

      <div className="selected-album-preview">
        {imgError ? (
          <div className="preview-img-placeholder">No Cover</div>
        ) : (
          <img src={album.artworkUrl} alt={album.name} onError={() => setImgError(true)} />
        )}
        <div className="preview-info">
          <h3>{album.name}</h3>
          <p>{album.artist}</p>
          {album.trackCount && (
            <span className="track-count">{album.trackCount} tracks</span>
          )}
        </div>
      </div>

      <p className="sleeve-description">
        Generates a printable insert with album artwork and track listing.
      </p>

      <div className="output-type-selector">
        <label>Output Type:</label>
        <div className="radio-group">
          <label className={outputType === 'sleeve' ? 'selected' : ''}>
            <input
              type="radio"
              name="outputType"
              value="sleeve"
              checked={outputType === 'sleeve'}
              onChange={(e) => setOutputType(e.target.value)}
            />
            <span>Paper Sleeve (foldable)</span>
          </label>
          <label className={outputType === 'jewel' ? 'selected' : ''}>
            <input
              type="radio"
              name="outputType"
              value="jewel"
              checked={outputType === 'jewel'}
              onChange={(e) => setOutputType(e.target.value)}
            />
            <span>Jewel Case Insert</span>
          </label>
        </div>
      </div>

      <div className="paper-size-selector">
        <label>Paper Size:</label>
        <div className="radio-group">
          <label className={paperSize === 'letter' ? 'selected' : ''}>
            <input
              type="radio"
              name="paperSize"
              value="letter"
              checked={paperSize === 'letter'}
              onChange={(e) => setPaperSize(e.target.value)}
            />
            <span>Letter (8.5" x 11")</span>
          </label>
          <label className={paperSize === 'a4' ? 'selected' : ''}>
            <input
              type="radio"
              name="paperSize"
              value="a4"
              checked={paperSize === 'a4'}
              onChange={(e) => setPaperSize(e.target.value)}
            />
            <span>A4 (210mm x 297mm)</span>
          </label>
        </div>
      </div>

      {outputType === 'jewel' && (
        <div className="back-cover-selector">
          <label>Back Cover:</label>
          <div className="radio-group">
            <label className={backCoverMode === 'artwork' ? 'selected' : ''}>
              <input
                type="radio"
                name="backCoverMode"
                value="artwork"
                checked={backCoverMode === 'artwork'}
                onChange={(e) => setBackCoverMode(e.target.value)}
              />
              <span>Artwork Only</span>
            </label>
            <label className={backCoverMode === 'tracks' ? 'selected' : ''}>
              <input
                type="radio"
                name="backCoverMode"
                value="tracks"
                checked={backCoverMode === 'tracks'}
                onChange={(e) => setBackCoverMode(e.target.value)}
              />
              <span>Track List Only</span>
            </label>
            <label className={backCoverMode === 'both' ? 'selected' : ''}>
              <input
                type="radio"
                name="backCoverMode"
                value="both"
                checked={backCoverMode === 'both'}
                onChange={(e) => setBackCoverMode(e.target.value)}
              />
              <span>Both (Overlay)</span>
            </label>
          </div>
        </div>
      )}

      <button
        className="generate-button"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : `Download ${outputType === 'jewel' ? 'Jewel Case Insert' : 'Paper Sleeve'}`}
      </button>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
