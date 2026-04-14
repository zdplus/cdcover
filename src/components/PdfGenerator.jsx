import { useState } from 'react';
import { generateCDCoverPDF, generateJewelCasePDF } from '../utils/pdfCreator';
import { getAlbumTracks } from '../utils/itunesApi';

export default function PdfGenerator({ album }) {
  const [outputType, setOutputType] = useState('sleeve');
  const [paperSize, setPaperSize] = useState('letter');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch tracks for the album (may return empty array on error)
      const tracks = await getAlbumTracks(album.id);
      console.log('Tracks fetched:', tracks.length);

      if (outputType === 'jewel') {
        await generateJewelCasePDF(album, tracks, paperSize);
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
        <img src={album.artworkUrl} alt={album.name} />
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
