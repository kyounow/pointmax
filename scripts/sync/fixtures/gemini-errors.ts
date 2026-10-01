// Gemini API のエラー応答本文 (テスト用 fixture)。
// QUOTA_DAILY_429_BODY と OVERLOADED_503_BODY は weekly-sync の実ログから逐語で採取した
// (2026-09-20 run 35543142652 の d-pay attempt 1 / 2026-09-13 run 34787956271 の attempt 2)。
// quotaId の文字列 (PerDay / PerMinute) に打ち切り判定が依存するため、実物を固定しておく。
// QUOTA_MINUTE_429_BODY / API_KEY_INVALID_400_BODY は同じ google.rpc 形式で組んだ合成値。

export const QUOTA_DAILY_429_BODY = {
  error: {
    code: 429,
    message:
      "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash\nPlease retry in 27.359489363s.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.Help",
        links: [
          {
            description: "Learn more about Gemini API quotas",
            url: "https://ai.google.dev/gemini-api/docs/rate-limits",
          },
        ],
      },
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaMetric:
              "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
            quotaDimensions: { location: "global", model: "gemini-2.5-flash" },
            quotaValue: "20",
          },
        ],
      },
      {
        "@type": "type.googleapis.com/google.rpc.RetryInfo",
        retryDelay: "27s",
      },
    ],
  },
};

export const QUOTA_MINUTE_429_BODY = {
  error: {
    code: 429,
    message:
      "You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, model: gemini-2.5-flash\nPlease retry in 27.1s.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaMetric:
              "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
            quotaDimensions: { location: "global", model: "gemini-2.5-flash" },
            quotaValue: "10",
          },
        ],
      },
      {
        "@type": "type.googleapis.com/google.rpc.RetryInfo",
        retryDelay: "27s",
      },
    ],
  },
};

export const OVERLOADED_503_BODY = {
  error: {
    code: 503,
    message:
      "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
    status: "UNAVAILABLE",
  },
};

export const API_KEY_INVALID_400_BODY = {
  error: {
    code: 400,
    message: "API key not valid. Please pass a valid API key.",
    status: "INVALID_ARGUMENT",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        reason: "API_KEY_INVALID",
        domain: "googleapis.com",
        metadata: { service: "generativelanguage.googleapis.com" },
      },
    ],
  },
};

/**
 * @google/genai の ApiError と同じ形 ({ status, message = JSON.stringify(本文) }) の Error。
 * classifyGeminiError は instanceof ではなく status の duck typing で判定するので、これで代用できる。
 */
export function apiErrorLike(status: number, body: unknown): Error & { status: number } {
  const e = new Error(JSON.stringify(body)) as Error & { status: number };
  e.name = "ApiError";
  e.status = status;
  return e;
}

/** fetch スタブ用: JSON のエラー応答 (content-type application/json)。呼ぶたびに新しい Response を返す。 */
export function jsonErrorResponse(status: number, statusText: string, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}
