"use client";

import { useState } from "react";

// JSON → base64url 인코딩 (URL에서 +,/,= 가 깨지지 않게)
function encodePayload(text: string): string {
  const json = JSON.stringify({ text });
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function Home() {
  const [text, setText] = useState("안녕하세요");
  const encoded = encodePayload(text);
  const url = `/api/og?d=${encoded}`;

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24 }}>text → base64 → image</h1>

      <label style={{ display: "block", marginTop: 24, fontWeight: 600 }}>
        텍스트
      </label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          marginTop: 8,
          boxSizing: "border-box",
        }}
      />

      <p style={{ marginTop: 24, fontWeight: 600 }}>이미지 URL</p>
      <code
        style={{
          display: "block",
          padding: 12,
          background: "#f1f5f9",
          borderRadius: 6,
          wordBreak: "break-all",
          fontSize: 13,
        }}
      >
        {url}
      </code>

      <p style={{ marginTop: 24, fontWeight: 600 }}>미리보기</p>
      <img
        src={url}
        alt="preview"
        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
      />
    </main>
  );
}
