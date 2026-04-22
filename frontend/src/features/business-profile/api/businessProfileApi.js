const BUSINESS_PROFILE_URL = "/api/business-profile";

async function parseJson(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function makeError(message, status, data) {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
}

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

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw makeError(
      data?.message || `Request failed with status ${response.status}.`,
      response.status,
      data
    );
  }

  return data;
}

export async function getBusinessProfile() {
  try {
    const data = await request(BUSINESS_PROFILE_URL, {
      method: "GET",
    });

    if (data?.success === false && !data?.profile) {
      return null;
    }

    return normalizeProfile(data?.profile);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createBusinessProfile(values) {
  const payload = buildPayload(values);

  const data = await request(BUSINESS_PROFILE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const directProfile = normalizeProfile(data?.profile);
  if (directProfile) return directProfile;

  return getBusinessProfile();
}

export async function updateBusinessProfile(values) {
  const payload = buildPayload(values);

  const data = await request(BUSINESS_PROFILE_URL, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

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
    if (error.status === 409) {
      return updateBusinessProfile(values);
    }

    throw error;
  }
}