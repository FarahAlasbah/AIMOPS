// frontend/src/features/business-profile/api/businessProfileApi.js
import api from "../../../api/api";

const BUSINESS_PROFILE_URL = "/api/business-profile";

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    profile_id: profile.profile_id ?? null,
    business_name: profile.business_name ?? "",
    industry: profile.industry ?? "",
    city: profile.city ?? "",
    created_at: profile.created_at ?? null,
  };
}

function buildPayload(values) {
  return {
    business_name: String(values.business_name || "").trim(),
    industry: String(values.industry || "").trim(),
    city: String(values.city || "").trim(),
  };
}

export async function getBusinessProfile() {
  try {
    const res = await api.get(BUSINESS_PROFILE_URL);
    const data = res.data;

    if (data?.success === false && !data?.profile) {
      return null;
    }

    return normalizeProfile(data?.profile);
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createBusinessProfile(values) {
  const payload = buildPayload(values);

  const res = await api.post(BUSINESS_PROFILE_URL, payload);
  const data = res.data;

  const directProfile = normalizeProfile(data?.profile);
  if (directProfile) return directProfile;

  return getBusinessProfile();
}

export async function updateBusinessProfile(values) {
  const payload = buildPayload(values);

  const res = await api.put(BUSINESS_PROFILE_URL, payload);
  const data = res.data;

  const directProfile = normalizeProfile(data?.profile);
  if (directProfile) return directProfile;

  return getBusinessProfile();
}

export async function saveBusinessProfile(values, hasExistingProfile) {
  if (hasExistingProfile) {
    return updateBusinessProfile(values);
  }

  try {
    return await createBusinessProfile(values);
  } catch (error) {
    if (error.response?.status === 409) {
      return updateBusinessProfile(values);
    }

    throw error;
  }
}