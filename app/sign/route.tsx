import { ImageResponse } from "next/og";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

// URL의 base64(JSON)를 디코드한다. base64url / 표준 base64 모두 허용.
function decodePayload(raw: string): { text: string } {
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf-8");
  const data = JSON.parse(json);

  if (typeof data?.text !== "string") {
    throw new Error("payload must contain a 'text' string field");
  }
  return { text: data.text };
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("d");

  if (!raw) {
    return new Response("missing 'd' query param (base64-encoded JSON)", {
      status: 400,
    });
  }

  let payload: { text: string };
  try {
    payload = decodePayload(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload";
    return new Response(`invalid 'd' param: ${message}`, { status: 400 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1120",
          color: "#f8fafc",
          fontSize: 64,
          fontWeight: 700,
          padding: 80,
          textAlign: "center",
        }}
      >
        {payload.text}
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
