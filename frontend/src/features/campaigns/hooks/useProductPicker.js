import { useMemo, useState } from "react";

export function useProductPicker({
  availableProducts,
  selectedProducts,
  onAddProduct,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortValue, setSortValue] = useState("name-asc");
  const [draftProducts, setDraftProducts] = useState([]);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((item) => item.product_id)),
    [selectedProducts],
  );

  const draftIds = useMemo(
    () => new Set(draftProducts.map((item) => item.id)),
    [draftProducts],
  );

  const blockedIds = useMemo(() => {
    return new Set([...selectedIds, ...draftIds]);
  }, [selectedIds, draftIds]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        availableProducts
          .map((product) => product.category)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [availableProducts]);

  const hasAvailableToSelect = useMemo(() => {
    return availableProducts.some((product) => !blockedIds.has(product.id));
  }, [availableProducts, blockedIds]);

  const filteredProducts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    const nextProducts = availableProducts
      .filter((product) => !blockedIds.has(product.id))
      .filter((product) => {
        const name = String(product.name || "").toLowerCase();
        const category = String(product.category || "").toLowerCase();

        const matchesQuery =
          !query || name.includes(query) || category.includes(query);

        const matchesCategory =
          categoryFilter === "all" || product.category === categoryFilter;

        return matchesQuery && matchesCategory;
      });

    switch (sortValue) {
      case "name-desc":
        return nextProducts.sort((a, b) => b.name.localeCompare(a.name));

      case "category":
        return nextProducts.sort((a, b) => {
          const categoryCompare = a.category.localeCompare(b.category);
          if (categoryCompare !== 0) return categoryCompare;
          return a.name.localeCompare(b.name);
        });

      case "name-asc":
      default:
        return nextProducts.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [availableProducts, blockedIds, searchValue, categoryFilter, sortValue]);

  const openModal = () => {
    setDraftProducts([]);
    setIsModalOpen(true);
  };

  const cancelModal = () => {
    setDraftProducts([]);
    setIsModalOpen(false);
  };

  const addDraftProduct = (product) => {
    setDraftProducts((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const applyDraftProducts = () => {
    draftProducts.forEach((product) => {
      onAddProduct(product);
    });

    setDraftProducts([]);
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    searchValue,
    setSearchValue,
    categoryFilter,
    setCategoryFilter,
    sortValue,
    setSortValue,
    draftProducts,
    categories,
    hasAvailableToSelect,
    filteredProducts,

    openModal,
    cancelModal,
    addDraftProduct,
    applyDraftProducts,
  };
}