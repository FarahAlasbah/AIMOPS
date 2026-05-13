import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { Card, FormCalendar, PageHeader } from "../../../shared/components";
import PageHelp from "../../../shared/components/PageHelp";
import { getCampaignCalendar, getCampaigns } from "../../../api/campaigns";
import { formatDate, getDefaultCalendarRange } from "../utils";
import { CampaignStatusBadge } from "../components";

import "./CampaignCalendar.css";

const getCampaignId = (campaign) =>
  campaign?.campaign_id ?? campaign?.id ?? campaign?.campaignId;

const getCampaignStartDate = (campaign) =>
  campaign?.start_date ?? campaign?.startDate ?? campaign?.date_start;

const getCampaignEndDate = (campaign) =>
  campaign?.end_date ?? campaign?.endDate ?? campaign?.date_end;

const toDateKey = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const overlapsRange = (campaign, startDate, endDate) => {
  const campaignStart = toDateKey(getCampaignStartDate(campaign));
  const campaignEnd = toDateKey(getCampaignEndDate(campaign)) || campaignStart;

  if (!campaignStart || !startDate || !endDate) return false;

  return campaignStart <= endDate && campaignEnd >= startDate;
};

const normalizeCampaignList = (response) => {
  if (Array.isArray(response?.campaigns)) return response.campaigns;
  if (Array.isArray(response)) return response;
  return [];
};

const mergeCampaigns = (...lists) => {
  const map = new Map();

  lists.flat().forEach((campaign) => {
    const id = getCampaignId(campaign);
    if (!id) return;

    map.set(String(id), {
      ...map.get(String(id)),
      ...campaign,
    });
  });

  return Array.from(map.values());
};

function CalendarCampaignSkeleton({ count = 3 }) {
  return (
    <div className="calendar-cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="calendar-campaign-card">
          <div className="calendar-campaign-top">
            <div className="calendar-skeleton-stack">
              <div className="calendar-sk" style={{ width: 190, height: 18 }} />
              <div className="calendar-sk" style={{ width: 120, height: 13 }} />
            </div>

            <div className="calendar-sk calendar-sk-pill" />
          </div>

          <div className="calendar-campaign-grid">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <div key={itemIndex}>
                <div
                  className="calendar-sk"
                  style={{ width: "46%", height: 12, marginBottom: 10 }}
                />
                <div
                  className="calendar-sk"
                  style={{ width: "70%", height: 15 }}
                />
              </div>
            ))}
          </div>

          <div className="calendar-skeleton-products">
            <div className="calendar-sk" style={{ width: 100, height: 13 }} />
            <div className="calendar-skeleton-chip-row">
              <div className="calendar-sk calendar-sk-chip" />
              <div className="calendar-sk calendar-sk-chip" />
              <div className="calendar-sk calendar-sk-chip" />
            </div>
          </div>

          <div className="calendar-campaign-actions">
            <div
              className="calendar-sk"
              style={{ width: 82, height: 44, borderRadius: 12 }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

const CampaignCalendar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");

  const defaultRange = getDefaultCalendarRange();

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadCalendar = useCallback(
    async ({ showRefreshing = false } = {}) => {
      if (!startDate || !endDate) return;

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

      try {
        const [calendarResponse, campaignsResponse] = await Promise.all([
          getCampaignCalendar({ startDate, endDate }).catch(() => null),
          getCampaigns(),
        ]);

        const calendarCampaigns = normalizeCampaignList(calendarResponse);
        const allCampaigns = normalizeCampaignList(campaignsResponse);

        const merged = mergeCampaigns(calendarCampaigns, allCampaigns)
          .filter((campaign) => overlapsRange(campaign, startDate, endDate))
          .sort((a, b) =>
            toDateKey(getCampaignStartDate(a)).localeCompare(
              toDateKey(getCampaignStartDate(b)),
            ),
          );

        setCampaigns(merged);
      } catch (error) {
        setPageError(error.message || t("messages.loadError"));
        setCampaigns([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, startDate, t],
  );

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const groupedCampaigns = useMemo(() => {
    const map = new Map();

    campaigns.forEach((campaign) => {
      const key = toDateKey(getCampaignStartDate(campaign)) || "unknown";

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(campaign);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [campaigns]);

  const handleRefresh = () => {
    loadCalendar({ showRefreshing: true });
  };

  const showSkeleton = loading || refreshing;

  return (
    <div className="campaign-calendar-page">
      <PageHeader
        actions={
          <div className="campaign-calendar-top-actions" style={{ marginBottom: 0 }}>
            <PageHelp
              title={t("help.calendar.title")}
              buttonLabel={t("help.calendar.buttonLabel")}
              items={[
                {
                  title: t("help.calendar.items.range.title"),
                  description: t("help.calendar.items.range.description"),
                },
                {
                  title: t("help.calendar.items.grouping.title"),
                  description: t("help.calendar.items.grouping.description"),
                },
                {
                  title: t("help.calendar.items.status.title"),
                  description: t("help.calendar.items.status.description"),
                },
                {
                  title: t("help.calendar.items.productsBudget.title"),
                  description: t("help.calendar.items.productsBudget.description"),
                },
                {
                  title: t("help.calendar.items.details.title"),
                  description: t("help.calendar.items.details.description"),
                },
              ]}
              note={t("help.calendar.note")}
            />

            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/app/campaigns")}
            >
              {t("actions.backToCampaigns")}
            </button>
          </div>
        }
      />

      {pageError ? (
        <div className="campaign-page-alert error">{pageError}</div>
      ) : null}

      <Card>
        <div className="calendar-toolbar">
          <div className="calendar-toolbar-field">
            <FormCalendar
              label={t("fields.startDate")}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={refreshing}
            />
          </div>

          <div className="calendar-toolbar-field">
            <FormCalendar
              label={t("fields.endDate")}
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={refreshing}
            />
          </div>

          <div className="calendar-toolbar-action">
            <span className="calendar-toolbar-action-spacer">
              {t("toolbar.refresh")}
            </span>

            <button
              type="button"
              className="calendar-refresh-icon-btn"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title={t("toolbar.refresh")}
              aria-label={t("toolbar.refresh")}
            >
              <RefreshCw
                size={18}
                className={loading || refreshing ? "spin-icon" : ""}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card aria-busy={showSkeleton}>
        {showSkeleton ? (
          <CalendarCampaignSkeleton />
        ) : campaigns.length ? (
          <div className="calendar-cards">
            {groupedCampaigns.map(([dateKey, items]) => (
              <div key={dateKey} className="calendar-day-group">
                <div className="calendar-day-title">{formatDate(dateKey)}</div>

                {items.map((campaign) => {
                  const campaignId = getCampaignId(campaign);
                  const productsCount =
                    campaign.product_count ?? campaign.products?.length ?? 0;

                  return (
                    <article key={campaignId} className="calendar-campaign-card">
                      <div className="calendar-campaign-top">
                        <div>
                          <h3>{campaign.campaign_name}</h3>
                          <p>
                            {t(`types.${campaign.campaign_type}`, {
                              defaultValue: campaign.campaign_type || "-",
                            })}
                          </p>
                        </div>

                        <CampaignStatusBadge status={campaign.status} />
                      </div>

                      <div className="calendar-campaign-grid">
                        <div>
                          <span>{t("fields.startDate")}</span>
                          <strong>
                            {formatDate(getCampaignStartDate(campaign))}
                          </strong>
                        </div>

                        <div>
                          <span>{t("fields.endDate")}</span>
                          <strong>{formatDate(getCampaignEndDate(campaign))}</strong>
                        </div>

                        <div>
                          <span>{t("list.headers.products")}</span>
                          <strong>{productsCount}</strong>
                        </div>

                        <div>
                          <span>{t("fields.budget")}</span>
                          <strong>{campaign.budget ?? "-"}</strong>
                        </div>
                      </div>

                      {campaign.products?.length ? (
                        <div className="calendar-products-row">
                          <span>{t("details.products")}</span>

                          <div className="calendar-products-wrap">
                            {campaign.products.map((product) => (
                              <span
                                key={product.product_id}
                                className="calendar-product-chip"
                              >
                                {product.product_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="calendar-campaign-actions">
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => navigate(`/app/campaigns/${campaignId}`)}
                        >
                          {t("actions.view")}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="campaign-calendar-empty">
            {t("calendar.noCampaigns")}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CampaignCalendar;