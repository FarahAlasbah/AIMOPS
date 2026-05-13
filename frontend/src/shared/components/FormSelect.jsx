// frontend/src/shared/components/FormSelect.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import "./FormInput.css";
import "./FormSelect.css";

const normalizeOptions = (options = []) => {
  return options.map((option) => {
    if (typeof option === "string" || typeof option === "number") {
      return {
        value: String(option),
        label: String(option),
        disabled: false,
      };
    }

    return {
      value: String(option?.value ?? ""),
      label: String(option?.label ?? option?.value ?? ""),
      disabled: !!option?.disabled,
    };
  });
};

const getSelectedLabel = ({ normalizedOptions, value, placeholder }) => {
  const selected = normalizedOptions.find(
    (option) => String(option.value) === String(value ?? ""),
  );

  return selected?.label || placeholder || "";
};

export default function FormSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  required = false,
  disabled = false,
  error,
  name,
  className = "",
  ...props
}) {
  const { t } = useTranslation("common");

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  const selectedIndex = useMemo(
    () =>
      normalizedOptions.findIndex(
        (option) => String(option.value) === String(value ?? ""),
      ),
    [normalizedOptions, value],
  );

  const selectedLabel = getSelectedLabel({
    normalizedOptions,
    value,
    placeholder: placeholder || t("shared.formSelect.placeholder"),
  });

  const hasValue = selectedIndex >= 0;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < 260 && spaceAbove > spaceBelow;

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      top: shouldOpenUp ? "auto" : rect.bottom + 8,
      bottom: shouldOpenUp ? window.innerHeight - rect.top + 8 : "auto",
      width: rect.width,
      zIndex: 9999,
    });
  };

  const openMenu = () => {
    if (disabled) return;

    setOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    requestAnimationFrame(updateMenuPosition);
  };

  const closeMenu = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const emitChange = (nextValue) => {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    });
  };

  const selectOption = (option) => {
    if (!option || option.disabled) return;

    emitChange(option.value);
    closeMenu();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();

    const handleMouseDown = (event) => {
      const insideTrigger = wrapRef.current?.contains(event.target);
      const insideList = listRef.current?.contains(event.target);

      if (!insideTrigger && !insideList) {
        closeMenu();
      }
    };

    const handlePositionChange = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("resize", handlePositionChange);
    window.addEventListener("scroll", handlePositionChange, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handlePositionChange);
      window.removeEventListener("scroll", handlePositionChange, true);
    };
  }, [open]);

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (!open && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }

    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((prev) => {
        const start = prev < 0 ? 0 : prev + 1;

        for (let i = 0; i < normalizedOptions.length; i += 1) {
          const index = (start + i) % normalizedOptions.length;
          if (!normalizedOptions[index]?.disabled) return index;
        }

        return prev;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((prev) => {
        const start = prev < 0 ? normalizedOptions.length - 1 : prev - 1;

        for (let i = 0; i < normalizedOptions.length; i += 1) {
          const index =
            (start - i + normalizedOptions.length) %
            normalizedOptions.length;

          if (!normalizedOptions[index]?.disabled) return index;
        }

        return prev;
      });

      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(normalizedOptions[activeIndex]);
    }
  };

  useEffect(() => {
    if (!open) return;

    const activeElement = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`,
    );

    activeElement?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  return (
    <div
      className={`form-group form-select-custom ${className}`.trim()}
      ref={wrapRef}
    >
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        className={[
          "fs-trigger",
          error ? "error" : "",
          open ? "open" : "",
          disabled ? "disabled" : "",
          hasValue ? "has-value" : "",
        ].join(" ")}
        onClick={() => {
          if (open) closeMenu();
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...props}
      >
        <span className="fs-value">{selectedLabel}</span>

        <span className="fs-chevron" aria-hidden="true">
          <ChevronDown size={18} />
        </span>
      </button>

      {error && <span className="form-error">{error}</span>}

      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fs-menu"
            style={menuStyle}
            role="listbox"
          >
            {normalizedOptions.length === 0 ? (
              <div className="fs-empty">{t("shared.formSelect.noOptions")}</div>
            ) : (
              normalizedOptions.map((option, index) => {
                const selected = String(option.value) === String(value ?? "");
                const active = index === activeIndex;

                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    className={[
                      "fs-option",
                      selected ? "selected" : "",
                      active ? "active" : "",
                      option.disabled ? "disabled" : "",
                    ].join(" ")}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                    disabled={option.disabled}
                  >
                    <span className="fs-option-label">{option.label}</span>

                    {selected && (
                      <span className="fs-check" aria-hidden="true">
                        <Check size={16} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}