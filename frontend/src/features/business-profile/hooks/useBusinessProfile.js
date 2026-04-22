import { useContext } from "react";
import { BusinessProfileContext } from "../context/BusinessProfileContext";

export function useBusinessProfile() {
  const context = useContext(BusinessProfileContext);

  if (!context) {
    throw new Error("useBusinessProfile must be used inside BusinessProfileProvider.");
  }

  return context;
}