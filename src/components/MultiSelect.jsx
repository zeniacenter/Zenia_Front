import { useState, useRef, useEffect } from 'react';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--land-border)',
    borderRadius: '8px',
    background: 'var(--land-bg-card)',
    padding: '0.4rem 0.6rem',
    flexWrap: 'wrap',
    gap: '0.3rem',
    minHeight: '42px',
    cursor: 'text',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '0.9rem',
    minWidth: '80px',
    padding: '0.2rem 0',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    background: 'rgba(201,148,74,0.15)',
    border: '1px solid #C9944A',
    fontSize: '0.8rem',
    color: '#333',
    whiteSpace: 'nowrap',
  },
  tagRemove: {
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    lineHeight: 1,
    color: '#C9944A',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    border: '1px solid var(--land-border)',
    borderRadius: '8px',
    background: 'var(--land-bg-card)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 1000,
    maxHeight: '220px',
    overflowY: 'auto',
    marginTop: '4px',
  },
  option: {
    padding: '0.55rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.88rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--land-border)',
  },
  optionSelected: {
    background: 'rgba(201,148,74,0.1)',
    borderBottom: '1px solid var(--land-border)',
  },
  optionCheck: {
    color: '#C9944A',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  empty: {
    padding: '0.75rem',
    textAlign: 'center',
    color: 'var(--land-text-muted)',
    fontSize: '0.85rem',
  },
  hint: {
    color: 'var(--land-text-muted)',
    fontSize: '0.75rem',
    marginTop: '0.25rem',
  },
};

export default function MultiSelect({ options, value = [], onChange, placeholder = 'Buscar...', labelField, valueField = 'id' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (opt) => {
    if (labelField) return opt[labelField];
    return opt.name || opt.label || String(opt[valueField]);
  };

  const getValue = (opt) => opt[valueField];

  const filtered = options.filter((opt) => {
    const label = getLabel(opt).toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const isSelected = (opt) => value.includes(getValue(opt));

  const toggle = (opt) => {
    const val = getValue(opt);
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
    setSearch('');
    inputRef.current?.focus();
  };

  const remove = (val) => {
    onChange(value.filter((v) => v !== val));
  };

  const selectedOptions = options.filter((opt) => value.includes(getValue(opt)));

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        {selectedOptions.map((opt) => (
          <span key={getValue(opt)} style={styles.tag}>
            {getLabel(opt)}
            <button type="button" style={styles.tagRemove} onClick={(e) => { e.stopPropagation(); remove(getValue(opt)); }}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          style={styles.input}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
        />
        <span style={{ color: 'var(--land-text-muted)', fontSize: '0.8rem', marginLeft: '0.3rem', userSelect: 'none' }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={styles.dropdown}>
          {filtered.length === 0 && (
            <div style={styles.empty}>No se encontraron opciones</div>
          )}
          {filtered.map((opt) => (
            <div
              key={getValue(opt)}
              style={{ ...styles.option, ...(isSelected(opt) ? styles.optionSelected : {}) }}
              onClick={() => toggle(opt)}
            >
              <span>{getLabel(opt)}</span>
              {isSelected(opt) && <span style={styles.optionCheck}>✓</span>}
            </div>
          ))}
        </div>
      )}
      <div style={styles.hint}>Selecciona uno o más</div>
    </div>
  );
}
