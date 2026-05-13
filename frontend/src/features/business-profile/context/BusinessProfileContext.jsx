import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import i18n from "../../../i18n";
import { getBusinessProfile, saveBusinessProfile } from "../api/businessProfileApi";

export const BusinessProfileContext = createContext(null);

const tBusinessProfile = (key) =>
  i18n.t(key, {
    ns: "businessProfile",
  });

export function BusinessProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getBusinessProfile();
      setProfile(result);
    } catch (err) {
      setError(err?.message || tBusinessProfile("context.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const persistProfile = useCallback(
    async (values) => {
      setSaving(true);
      setError("");

      try {
        const result = await saveBusinessProfile(values, Boolean(profile?.profile_id));
        setProfile(result);

        return {
          success: true,
          profile: result,
        };
      } catch (err) {
        const message = err?.message || tBusinessProfile("context.saveFailed");
        setError(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  const value = useMemo(
    () => ({
      profile,
      loading,
      saving,
      error,
      hasProfile: Boolean(profile?.profile_id),
      isProfileComplete: Boolean(
        profile?.business_name && profile?.industry && profile?.city,
      ),
      loadProfile,
      persistProfile,
    }),
    [profile, loading, saving, error, loadProfile, persistProfile],
  );

  return (
    <BusinessProfileContext.Provider value={value}>
      {children}
    </BusinessProfileContext.Provider>
  );
}