import { Card } from "../../../../shared/components";

const CHANNEL_LABEL_FALLBACKS = {
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  email: "Email",
  sms: "SMS",
  in_store: "In-Store",
};

function humanizeChannel(value) {
  if (!value) return "";

  return String(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getChannelValue(channel) {
  if (!channel) return "";

  if (typeof channel === "string") {
    return channel.trim();
  }

  if (typeof channel !== "object") {
    return String(channel).trim();
  }

  return String(
    channel.channel_name ||
      channel.channelName ||
      channel.name ||
      channel.value ||
      channel.channel ||
      "",
  ).trim();
}

function getChannelLabel(channelValue, t) {
  if (!channelValue) return "";

  return t(`channels.${channelValue}`, {
    defaultValue:
      CHANNEL_LABEL_FALLBACKS[channelValue] || humanizeChannel(channelValue),
  });
}

export default function CampaignChannelsCard({ t, campaign }) {
  const channels = Array.isArray(campaign?.channels)
    ? campaign.channels
        .map((channel) => {
          const value = getChannelValue(channel);

          return {
            value,
            label: getChannelLabel(value, t),
          };
        })
        .filter((channel) => channel.value)
    : [];

  return (
    <Card>
      <div className="details-section">
        <h3>{t("details.channels")}</h3>

        <div className="details-chip-wrap">
          {channels.length ? (
            channels.map((channel, index) => (
              <span
                key={`${channel.value}-${index}`}
                className="details-chip"
              >
                {channel.label}
              </span>
            ))
          ) : (
            <p className="details-empty-text">-</p>
          )}
        </div>
      </div>
    </Card>
  );
}