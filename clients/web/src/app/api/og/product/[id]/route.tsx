import { ImageResponse } from "next/og";
import { getServerSideAPI } from "@/utils/client/serverside";
import { unwrap } from "@/lib/api";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const api = await getServerSideAPI();

  let name = "Product";
  let creator = "";
  let price = "";

  try {
    const product = await unwrap(
      api.GET("/v1/products/slug/{slug}", {
        params: { path: { slug: id }, query: { args: null, kwargs: null } },
      }),
    );
    name = product.name;
    creator = (product as any).organization?.name ?? "";
    const p = product.prices?.[0];
    if (p) {
      const amt = ((p as any).price_amount ?? 0) / 100;
      const cur = ((p as any).price_currency ?? "KES").toUpperCase();
      price = cur === "KES" ? `KSh ${amt.toLocaleString()}` : `$${amt}`;
    }
  } catch {
    /* render fallback */
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        backgroundColor: "#FAFAF7",
        padding: "80px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "22px",
          fontWeight: 600,
          color: "#9B352F",
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
        }}
      >
        Blyss
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            fontSize: "72px",
            fontWeight: 600,
            color: "#1A1A17",
            lineHeight: 1.1,
            maxWidth: "900px",
            letterSpacing: "-1px",
          }}
        >
          {name}
        </div>
        {creator && (
          <div style={{ fontSize: "32px", color: "#4A4842" }}>by {creator}</div>
        )}
        {price && (
          <div style={{ fontSize: "40px", fontWeight: 600, color: "#9B352F" }}>
            {price}
          </div>
        )}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
