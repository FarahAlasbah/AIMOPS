import { Card } from "../../../../shared/components";

export default function CampaignProductsCard({ t, campaign }) {
  return (
    <Card>
      <div className="details-section">
        <h3>{t("details.products")}</h3>

        {campaign.products?.length ? (
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>{t("details.productName")}</th>
                  <th>{t("details.category")}</th>
                  <th>{t("fields.discountPct")}</th>
                  <th>{t("fields.targetQuantity")}</th>
                </tr>
              </thead>

              <tbody>
                {campaign.products.map((product) => (
                  <tr key={product.product_id}>
                    <td>{product.product_name}</td>
                    <td>{product.category || "-"}</td>
                    <td>{product.discount_pct ?? "-"}</td>
                    <td>{product.target_quantity ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="details-empty-text">-</p>
        )}
      </div>
    </Card>
  );
}