import { useState, useRef } from 'react';
import { uploadAPI } from '../services/api';

export default function ImageUpload({ value, onChange, imageableType, imageableId, label = 'Imagen' }) {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api')) {
      const base = API_BASE.replace('/api', '');
      return base + url;
    }
    return url;
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    if (!imageableType || !imageableId) {
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const res = await uploadAPI.image(file, imageableType, imageableId);
      setPreview(getFullUrl(res.data.url));
      onChange(res.data.url);
    } catch (err) {
      alert('Error al subir imagen');
      setPreview(value || '');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!imageableId) return;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (imageableId) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const isDisabled = !imageableId;

  return (
    <div className="form-group">
      <label>{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isDisabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDisabled ? '#3a302c' : dragOver ? '#C9A96E' : '#4A3D30'}`,
          borderRadius: '8px',
          padding: preview ? '0.5rem' : '1.5rem',
          textAlign: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          background: dragOver ? 'rgba(201,169,110,0.05)' : 'transparent',
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFile(e.target.files[0])}
          style={{ display: 'none' }}
          disabled={isDisabled}
        />

        {preview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '150px',
                borderRadius: '6px',
                objectFit: 'cover',
              }}
            />
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '6px', color: '#C9A96E', fontSize: '0.85rem',
              }}>
                Subiendo...
              </div>
            )}
            {!isDisabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                style={{
                  position: 'absolute', top: '-8px', right: '-8px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: '#C45B4A', color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: '14px', lineHeight: '24px',
                }}
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div style={{ color: '#B5A898' }}>
            {isDisabled ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  Guarda el registro primero para subir una imagen
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Arrastra una imagen aquí o <span style={{ color: '#C9A96E' }}>haz clic</span>
                </p>
                <p style={{ fontSize: '0.75rem' }}>JPG, PNG, WebP — Máx. 5MB</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
