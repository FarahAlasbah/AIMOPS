import { useForecastDetailsAnalytics } from "./useForecastDetailsAnalytics";
import { useForecastDetailsData } from "./useForecastDetailsData";

export function useForecastDetailsPage(productId) {
  const data = useForecastDetailsData(productId);

  const analytics = useForecastDetailsAnalytics({
    productId,
    status: data.status,
    forecast: data.forecast,
    detailsErr: data.detailsErr,
    explanationData: data.explanationData,
  });

  return {
    ...data,
    ...analytics,
  };
}