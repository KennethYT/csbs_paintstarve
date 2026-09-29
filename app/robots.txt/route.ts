/**
 * robots.txt。
 *
 * 不用 app/robots.ts：MetadataRoute.Robots 產不出註解，回應也只有 text/plain、不帶 charset，
 * 中文聲明在瀏覽器裡會變亂碼。所以這裡直接組字串，force-static 讓它在 build 時就產生好。
 *
 * robots.txt 只擋得住守規矩的爬蟲，真正的防線是壓在圖上的水印（見 lib/gallery.ts）。
 * 同樣的規則也寫在 /rules（app/rules/page.tsx）、public/ai.txt 和 public/_headers，改規則時要一起改。
 */
export const dynamic = "force-static";

const UPDATED = "2026-09-28";

/**
 * 已知的 AI 訓練、AI 助理、AI 搜尋與資料集爬蟲，整站拒絕。
 * 名單參考各家公開的 user agent，有新的再加。名稱只能用英數、- 和 _（含空白或斜線的 robots.txt 對不到）。
 */
const AI_CRAWLERS: { operator: string; agents: string[] }[] = [
  { operator: "OpenAI", agents: ["GPTBot", "ChatGPT-User", "OAI-SearchBot"] },
  { operator: "Anthropic", agents: ["ClaudeBot", "Claude-User", "Claude-SearchBot", "Claude-Web", "anthropic-ai"] },
  {
    operator: "Google（只擋 AI 用途，不影響 Google 搜尋）",
    agents: ["Google-Extended", "Google-CloudVertexBot", "GoogleOther", "GoogleOther-Image", "GoogleOther-Video"]
  },
  { operator: "Apple（只擋 AI 用途，不影響 Apple 搜尋）", agents: ["Applebot-Extended"] },
  { operator: "Meta", agents: ["meta-externalagent", "meta-externalfetcher", "FacebookBot"] },
  { operator: "Amazon", agents: ["Amazonbot", "bedrockbot"] },
  { operator: "ByteDance", agents: ["Bytespider", "TikTokSpider"] },
  { operator: "Perplexity", agents: ["PerplexityBot", "Perplexity-User"] },
  { operator: "Mistral", agents: ["MistralAI-User"] },
  { operator: "Cohere", agents: ["cohere-ai", "cohere-training-data-crawler"] },
  { operator: "Allen Institute for AI", agents: ["AI2Bot", "Ai2Bot-Dolma"] },
  { operator: "Huawei", agents: ["PanguBot"] },
  { operator: "Yandex（只擋 AI 用途）", agents: ["YandexAdditional", "YandexAdditionalBot"] },
  { operator: "DuckDuckGo", agents: ["DuckAssistBot"] },
  { operator: "You.com", agents: ["YouBot"] },
  { operator: "Phind", agents: ["PhindBot"] },
  { operator: "Common Crawl（多數 AI 資料集的來源）", agents: ["CCBot"] },
  { operator: "Webz.io", agents: ["Omgilibot", "Omgili", "Webzio-Extended"] },
  {
    operator: "其他資料集／AI 爬蟲",
    agents: [
      "Diffbot",
      "Timpibot",
      "ImagesiftBot",
      "img2dataset",
      "FirecrawlAgent",
      "Cotoyogi",
      "SBIntuitionsBot",
      "ICC-Crawler",
      "Crawlspace",
      "Scrapy"
    ]
  }
];

/** 圖片搜尋爬蟲。圖片搜尋是 AI 資料集常見的來源，整站拒絕。 */
const IMAGE_CRAWLERS = ["Googlebot-Image", "YandexImages", "Baiduspider-image"];

const POLICY = `# ================================================================
#  robots.txt — 暑期選修作品畫廊
#  最後更新：${UPDATED}
#  完整網站規範：/rules　　AI 聲明：/ai.txt
# ================================================================
#
# 【禁止 AI 使用本站圖片】
#
# 本站畫廊（/gallery/）的所有圖片，都是同學們的原創作品，
# 著作權屬於各自的作者。本站與作者「沒有」、也「不會」同意
# 任何人或任何程式將這些圖片用於下列用途：
#
#   1. 訓練、預訓練或微調任何 AI 模型
#      （包括 LoRA、DreamBooth、Textual Inversion、Embedding 等）。
#   2. 收錄進任何資料集，包括圖文配對、標註（caption／tag）、
#      向量索引、特徵擷取與模型評測資料集。
#   3. 作為生成式 AI 的輸入或參考：以圖生圖、模仿畫風、風格轉換、
#      ControlNet、IP-Adapter、先用 AI 描述圖片再生成等。
#   4. 讓 AI 助理或 AI 搜尋即時抓取，用來產生回答或摘要
#      （RAG、grounding）。
#   5. 對縮圖、裁切、截圖、去除水印的版本，或由圖片衍生的特徵與描述
#      做上述任何一件事，一樣禁止。
#
# 補充說明：
#   - 沒有列在下方的爬蟲、工具或個人，一樣適用以上規定。
#     沒被下方規則擋到，不代表取得授權。
#   - 圖片上的「NO AI TRAINING」水印與作者署名是作品的一部分，
#     移除、裁切或遮蓋都違反本站規範。
#   - 依歐盟《數位單一市場著作權指令》（Directive (EU) 2019/790）
#     第 4 條第 3 項，本站明確保留文字與資料探勘（TDM）的權利。
#     /gallery/ 與投稿圖檔 /uploads/ 的回應也附有 X-Robots-Tag: noai, noimageai
#     與 tdm-reservation: 1。
#   - 想使用作品，請直接聯絡作品下方標示的作者，取得本人同意。
#
# ----------------------------------------------------------------
#  NO AI USE OF IMAGES ON THIS SITE
# ----------------------------------------------------------------
#
# Every image in the gallery (/gallery/) is an original work by a
# student, and its copyright belongs to that artist. Neither this
# site nor the artists permit anyone, human or automated, to:
#
#   1. Train, pre-train or fine-tune any AI model
#      (including LoRA, DreamBooth, Textual Inversion, embeddings).
#   2. Include the images in any dataset (image-text pairs,
#      captions/tags, vector indexes, feature extraction, evals).
#   3. Use the images as input or reference for generative AI
#      (img2img, style mimicry, style transfer, ControlNet,
#      IP-Adapter, caption-then-generate, etc.).
#   4. Fetch the images in real time for AI assistants or AI search
#      answers (RAG, grounding).
#   5. Do any of the above with thumbnails, crops, screenshots,
#      watermark-removed copies, or features or descriptions
#      derived from the images.
#
# This applies to every crawler, tool and person, whether or not it
# is listed below. Not being blocked here is NOT permission.
# Removing or obscuring the "NO AI TRAINING" watermark or the
# artist credit is prohibited.
#
# Text and data mining rights are expressly reserved under
# Article 4(3) of Directive (EU) 2019/790.
# To use a work, ask the artist credited below it for permission.
#
# ================================================================
#  Content Signals（https://contentsignals.org/）
# ================================================================
#
#   search=yes   允許一般搜尋引擎收錄「網頁」並顯示連結與簡短摘錄，
#                不包括 AI 產生的搜尋摘要。
#   ai-input=no  禁止把本站內容即時輸入 AI 模型（RAG、AI 搜尋回答等）。
#   ai-train=no  禁止用本站內容訓練或微調 AI 模型。
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS
# RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION
# DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS IN THE
# DIGITAL SINGLE MARKET.
# ================================================================`;

const BODY = [
  POLICY,
  "",
  "# 【規則一】已知的 AI 訓練、AI 助理、AI 搜尋與資料集爬蟲：整站禁止。",
  "# [Rule 1] Known AI training, assistant, search and dataset crawlers: entire site disallowed.",
  ...AI_CRAWLERS.flatMap(({ operator, agents }) => [`# ${operator}`, ...agents.map((a) => `User-agent: ${a}`)]),
  "Content-Signal: search=no, ai-input=no, ai-train=no",
  "Disallow: /",
  "",
  "# 【規則二】圖片搜尋爬蟲：整站禁止（圖片搜尋是 AI 資料集常見的來源）。",
  "# [Rule 2] Image search crawlers: entire site disallowed (image search is a common source of AI datasets).",
  ...IMAGE_CRAWLERS.map((a) => `User-agent: ${a}`),
  "Content-Signal: search=no, ai-input=no, ai-train=no",
  "Disallow: /",
  "",
  "# 【規則三】其他爬蟲（一般搜尋引擎）：可以收錄網頁，但不可收錄畫廊圖檔。",
  "# [Rule 3] All other crawlers (regular search engines): pages may be indexed, gallery image files may not.",
  "User-agent: *",
  "Content-Signal: search=yes, ai-input=no, ai-train=no",
  "Allow: /",
  "Disallow: /gallery/",
  "Disallow: /uploads/",
  ""
].join("\n");

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
