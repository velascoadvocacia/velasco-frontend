import { useEffect, useRef, useState } from "react";

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: MultiSelectOption[];
  placeholder: string;
  onSelect: (option: MultiSelectOption) => void;
  onRemove: (id: string) => void;
}

export function MultiSelectDropdown({
  options,
  selected,
  placeholder,
  onSelect,
  onRemove
}: MultiSelectDropdownProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedIds = new Set(selected.map((option) => option.id));
  const filteredOptions = options.filter(
    (option) => !selectedIds.has(option.id) && option.label.toLowerCase().includes(query.toLowerCase())
  );

  function selectOption(option: MultiSelectOption) {
    onSelect(option);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="multi-select-dropdown" ref={containerRef}>
      <div className="multi-select-control" onClick={() => setIsOpen(true)}>
        <div className="multi-select-chips">
          {selected.map((option) => (
            <span className="multi-select-chip" key={option.id}>
              {option.label}
              <button
                type="button"
                aria-label={`Remover ${option.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(option.id);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={query}
            placeholder={selected.length ? "Adicionar advogado" : placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
            }}
          />
          <span className="multi-select-chevron" aria-hidden="true">▾</span>
        </div>
      </div>

      {isOpen ? (
        <div className="multi-select-menu">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                className="multi-select-option"
                type="button"
                key={option.id}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </button>
            ))
          ) : (
            <span className="multi-select-empty">Nenhum advogado encontrado.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
