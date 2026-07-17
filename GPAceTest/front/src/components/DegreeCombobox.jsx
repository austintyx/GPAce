import { useEffect, useMemo, useRef, useState } from 'react';
import { NTU_DEGREE_PROGRAMMES } from '../data/ntuDegreeProgrammes';
import './DegreeCombobox.css';

let comboboxInstanceCount = 0;

function categoryLabel(programme) {
  if (programme.category === 'doubleDegree') return 'Double Degree Programme';
  if (programme.category === 'doubleMajor') return 'Double Major Programme';
  return programme.college;
}

function DegreeCombobox({ id, value, onSelect, label, inputClassName = '', placeholder = 'Search NTU degree programmes', required = false }) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const listboxIdRef = useRef(id || `degree-combobox-list-${++comboboxInstanceCount}`);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return NTU_DEGREE_PROGRAMMES;
    return NTU_DEGREE_PROGRAMMES.filter((programme) =>
      programme.name.toLowerCase().includes(trimmed) ||
      categoryLabel(programme).toLowerCase().includes(trimmed)
    );
  }, [query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery(value || '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const commitSelection = (programme) => {
    onSelect(programme);
    setQuery(programme.name);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      const exactMatch = NTU_DEGREE_PROGRAMMES.some((programme) => programme.name === query);
      if (!exactMatch) setQuery(value || '');
    }, 0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && results[highlightedIndex]) commitSelection(results[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery(value || '');
    }
  };

  return (
    <div className="degree-combobox" ref={containerRef}>
      <input
        id={id}
        className={inputClassName}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxIdRef.current}
        aria-autocomplete="list"
        aria-label={label}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        required={required}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul className="degree-combobox-list" role="listbox" id={listboxIdRef.current}>
          {results.map((programme, index) => (
            <li
              key={programme.name}
              role="option"
              aria-selected={programme.name === value}
              className={`degree-combobox-option ${index === highlightedIndex ? 'highlighted' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                commitSelection(programme);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="degree-combobox-option-name">{programme.name}</span>
              <span className={`degree-combobox-option-college category-${programme.category}`}>{categoryLabel(programme)}</span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="degree-combobox-empty">No matching programme</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default DegreeCombobox;
