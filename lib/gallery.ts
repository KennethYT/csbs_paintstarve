/**
 * 首頁畫廊的作品清單。
 *
 * 圖片放在 public/gallery/，每張都有兩個尺寸：
 * - `<名稱>.webp`：燈箱用的大圖，最大 1600×2000
 * - `<名稱>-thumb.webp`：格線用的縮圖，寬 640px
 *
 * 每張圖（含縮圖）都已經壓上水印：滿版淡斜紋「@作者 · NO AI TRAINING」+ 右下角「© @作者 · 禁止 AI 學習／轉載」。
 * 新增圖片時也要先壓好水印再放進來，網頁上不會另外疊。
 *
 * 新增圖片前一定要先自己縮好：部署到 Cloudflare Workers 後沒有 IMAGES binding，
 * next/image 不會幫忙壓縮，原圖多大瀏覽器就下載多大，所以元件一律用 unoptimized 直接讀檔。
 * width / height 填大圖的實際像素，格線靠它預留版面，載入時才不會跳動；
 * color 是載入前的底色，填圖片的主色即可。
 */

export type GalleryArtist = {
  name: string;
  /** 有的話作者名稱會變成連結 */
  url?: string;
};

export type GalleryImage = {
  src: string;
  thumb: string;
  width: number;
  height: number;
  color: string;
  /** 單張圖的說明，例如漫畫的頁數 */
  caption?: string;
};

export type GalleryWork = {
  id: string;
  title?: string;
  artists: GalleryArtist[];
  /** 額外的署名說明，例如代為投稿的人 */
  note?: string;
  /** 多張圖時第一張當封面，燈箱裡依序翻頁 */
  images: GalleryImage[];
};

function img(name: string, width: number, height: number, color: string, caption?: string): GalleryImage {
  return {
    src: `/gallery/${name}.webp`,
    thumb: `/gallery/${name}-thumb.webp`,
    width,
    height,
    color,
    ...(caption ? { caption } : {})
  };
}

export const GALLERY_WORKS: GalleryWork[] = [
  {
    id: "caleb-revival",
    title: "學院圖（暑假作業）",
    artists: [{ name: "@Caleb_revival" }],
    images: [
      img("caleb-revival-1", 1600, 1600, "#f8f8f8")
    ]
  },
  {
    id: "fufu-flytosky",
    title: "甜品精靈",
    artists: [{ name: "@fufu_flytosky" }],
    images: [
      img("fufu-flytosky-1", 1600, 1600, "#f8f8f8")
    ]
  },
  {
    id: "yami-zo7-a",
    artists: [{ name: "@yami_zo7", url: "https://x.com/yami_zo7" }],
    images: [
      img("yami-zo7-a-1", 1414, 2000, "#f8f8f8")
    ]
  },
  {
    id: "yami-zo7-b",
    artists: [{ name: "@yami_zo7", url: "https://x.com/yami_zo7" }],
    images: [
      img("yami-zo7-b-1", 1600, 894, "#f8f8f8")
    ]
  },
  {
    id: "bread-manjyuuu-english",
    title: "english",
    artists: [{ name: "@bread_manjyuuu" }],
    images: [
      img("bread-manjyuuu-english-1", 537, 652, "#185818"),
      img("bread-manjyuuu-english-2", 892, 522, "#f8f8f8")
    ]
  },
  {
    id: "bread-manjyuuu-paintball",
    title: "漆彈 0906",
    artists: [{ name: "@bread_manjyuuu" }],
    images: [
      img("bread-manjyuuu-paintball-1", 544, 512, "#f8f8f8"),
      img("bread-manjyuuu-paintball-2", 508, 574, "#f8f8f8"),
      img("bread-manjyuuu-paintball-3", 316, 280, "#f8f8f8"),
      img("bread-manjyuuu-paintball-4", 601, 579, "#f8f8f8"),
      img("bread-manjyuuu-paintball-5", 189, 294, "#f8f8f8"),
      img("bread-manjyuuu-paintball-6", 1412, 851, "#f8f8f8"),
      img("bread-manjyuuu-paintball-7", 472, 412, "#f8f8f8"),
      img("bread-manjyuuu-paintball-8", 150, 170, "#f8f8f8"),
      img("bread-manjyuuu-paintball-9", 341, 401, "#f8f8f8"),
      img("bread-manjyuuu-paintball-10", 287, 475, "#f8f8f8")
    ]
  },
  {
    id: "bread-manjyuuu-tentacle",
    title: "觸手",
    artists: [{ name: "@bread_manjyuuu" }],
    images: [
      img("bread-manjyuuu-tentacle-1", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-2", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-3", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-4", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-5", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-6", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-7", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-8", 1600, 1424, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-9", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-10", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-11", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-12", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-13", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-14", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-15", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-16", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-17", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-18", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-19", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-20", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-21", 1600, 1118, "#d8d8d8"),
      img("bread-manjyuuu-tentacle-22", 1465, 1668, "#d8d8d8")
    ]
  },
  {
    id: "enyoecho0217",
    title: "魔法師頭像",
    artists: [{ name: "@EnyoEcho0217" }],
    images: [
      img("enyoecho0217-1", 1600, 1872, "#f8f8f8")
    ]
  },
  {
    id: "cyuan-nil",
    artists: [{ name: "@cyuan_nil" }],
    note: "投稿：@Karasuba_0525",
    images: [
      img("cyuan-nil-1", 1500, 2000, "#f8f8f8"),
      img("cyuan-nil-2", 1600, 1984, "#f8f8f8")
    ]
  },
  {
    id: "achan-akiho1231-matches",
    title: "關於第一堂課被老師放鳥我們來點根火柴吧",
    artists: [{ name: "@achan_akiho1231", url: "https://x.com/achan_akiho1231" }],
    images: [
      img("achan-akiho1231-matches-1", 1600, 1600, "#f8f8f8", "來點火柴取暖吧"),
      img("achan-akiho1231-matches-2", 1600, 1600, "#f8f8f8", "老師耶"),
      img("achan-akiho1231-matches-3", 1600, 1600, "#f8f8f8", "啊沒了")
    ]
  },
  {
    id: "achan-akiho1231-notes",
    title: "課後筆記",
    artists: [{ name: "@achan_akiho1231", url: "https://x.com/achan_akiho1231" }],
    images: [
      img("achan-akiho1231-notes-1", 1600, 1081, "#f8f8f8")
    ]
  },
  {
    id: "ruru-vt",
    artists: [{ name: "@Ruru_vt_" }],
    images: [
      img("ruru-vt-1", 1600, 1000, "#f8f8f8")
    ]
  },
  {
    id: "y71ridkejishfcv",
    artists: [{ name: "@Y71RIDKejisHfcV", url: "https://x.com/Y71RIDKejisHfcV" }],
    images: [
      img("y71ridkejishfcv-1", 1600, 900, "#f8f8f8")
    ]
  },
  {
    id: "shar-lotte-live2d",
    title: "初級 Live2D 課",
    artists: [{ name: "@Shar_lotte_" }],
    images: [
      img("shar-lotte-live2d-1", 782, 648, "#f8d8e8", "VTS 介面"),
      img("shar-lotte-live2d-2", 607, 561, "#f8d8d8", "VTS 介面截圖")
    ]
  },
  {
    id: "shar-lotte-bonsai",
    title: "盆栽幻形術",
    artists: [{ name: "@Shar_lotte_" }],
    images: [
      img("shar-lotte-bonsai-1", 1600, 1600, "#f8f8f8", "幻形的精靈"),
      img("shar-lotte-bonsai-2", 1600, 1600, "#080808", "種子")
    ]
  },
  {
    id: "yulie0106-1",
    title: "國強可可愛",
    artists: [{ name: "@yulie0106" }],
    images: [
      img("yulie0106-1-1", 735, 830, "#f8f8f8")
    ]
  },
  {
    id: "yulie0106-2",
    title: "從頭到尾勇往直前",
    artists: [{ name: "@yulie0106" }],
    images: [
      img("yulie0106-2-1", 688, 573, "#f8f8f8")
    ]
  },
  {
    id: "yulie0106-3",
    title: "拿裝備",
    artists: [{ name: "@yulie0106" }],
    images: [
      img("yulie0106-3-1", 577, 783, "#f8f8f8")
    ]
  },
  {
    id: "herbology-group",
    title: "草藥學合圖",
    artists: [{ name: "@c1uopng" }, { name: "@zichi_27" }, { name: "@Yuzuki_O1O9" }],
    images: [
      img("herbology-group-1", 1600, 1131, "#f8f8f8")
    ]
  },
  {
    id: "whitecat-kun",
    title: "植物精靈培育",
    artists: [{ name: "@whitecat_kun" }],
    images: [
      img("whitecat-kun-1", 1600, 1600, "#f8f8f8", "植物精靈"),
      img("whitecat-kun-2", 1600, 1600, "#f8f8f8", "種子")
    ]
  },
  {
    id: "anagaume-vt",
    title: "暑假作業",
    artists: [{ name: "@Anagaume_vt" }],
    images: [
      img("anagaume-vt-1", 1414, 2000, "#d8d8d8")
    ]
  },
  {
    id: "awaimokkha-night-tour",
    title: "山區夜間導覽",
    artists: [{ name: "@AwaiMokkha" }],
    images: [
      img("awaimokkha-night-tour-1", 692, 777, "#f8f8f8", "畫布上的初步構想"),
      img("awaimokkha-night-tour-2", 600, 600, "#f8f8f8", "來都來了"),
      img("awaimokkha-night-tour-3", 600, 540, "#f8f8f8", "所以帶走了"),
      img("awaimokkha-night-tour-4", 1222, 900, "#f8f8f8", "老師怎麼還沒回來"),
      img("awaimokkha-night-tour-5", 532, 566, "#f8f8f8", "老人帶小孩")
    ]
  },
  {
    id: "awaimokkha-service",
    title: "愛校服務",
    artists: [{ name: "@AwaiMokkha" }],
    images: [
      img("awaimokkha-service-1", 576, 863, "#f8f8f8", "畫布上的初步構想"),
      img("awaimokkha-service-2", 1000, 1000, "#f8f8f8"),
      img("awaimokkha-service-3", 1000, 1000, "#f8f8f8")
    ]
  },
  {
    id: "minezzzbobin-team",
    title: "暑輔前找組員",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-team-1", 1416, 2000, "#f8f8f8", "p1"),
      img("minezzzbobin-team-2", 1416, 2000, "#f8f8f8", "p2"),
      img("minezzzbobin-team-3", 1600, 800, "#f8f8f8", "p3 番外篇：狀況外同學")
    ]
  },
  {
    id: "minezzzbobin-ghost",
    title: "暑輔總算分組之組員被鬼抓走（鬼十分開心）",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-ghost-1", 1600, 1600, "#f8f8f8")
    ]
  },
  {
    id: "minezzzbobin-paintball",
    title: "漆彈課",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-paintball-1", 1398, 1984, "#f8f8f8", "(醬"),
      img("minezzzbobin-paintball-2", 1200, 900, "#f8f8f8", "9981"),
      img("minezzzbobin-paintball-3", 1200, 900, "#f8f8f8", "九九好帥"),
      img("minezzzbobin-paintball-4", 1000, 750, "#f8f8f8", "加雷特教官跳芭蕾"),
      img("minezzzbobin-paintball-5", 1200, 900, "#080808", "夜場亂跑鬼"),
      img("minezzzbobin-paintball-6", 1200, 900, "#082848", "夜場無敵八十一"),
      img("minezzzbobin-paintball-7", 1200, 900, "#f8f8f8", "暉星喪志小隊，媤緹睡死，組長奪命連環call"),
      img("minezzzbobin-paintball-8", 1200, 900, "#682838", "知道這是什麼哏的人我們一定會是很好的朋友"),
      img("minezzzbobin-paintball-9", 750, 750, "#f8f8f8", "純屬效果抖M鬼魂（教官好厲害竟然能打中我耶）"),
      img("minezzzbobin-paintball-10", 1398, 1984, "#f8f8f8", "醒來之後的事情"),
      img("minezzzbobin-paintball-11", 1200, 900, "#282828", "隔壁毛茸茸小動物小隊耳朵好可愛摸摸")
    ]
  },
  {
    id: "minezzzbobin-herbology",
    title: "自然草藥學科",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-herbology-1", 1410, 2000, "#f8f8f8", "大家都好餓"),
      img("minezzzbobin-herbology-2", 1398, 999, "#f8f8f8", "畫出自創的奇妙植物吧")
    ]
  },
  {
    id: "minezzzbobin-language",
    title: "語言與文化：罵人的藝術",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-language-1", 1410, 2000, "#f8f8f8", "p1"),
      img("minezzzbobin-language-2", 1410, 2000, "#f8f8f8", "p2"),
      img("minezzzbobin-language-3", 1409, 2000, "#f8f8f8", "p3"),
      img("minezzzbobin-language-4", 1286, 1285, "#f8f8f8", "p4 看起來像三條龍迷因")
    ]
  },
  {
    id: "minezzzbobin-slacking",
    title: "隨便摸魚",
    artists: [{ name: "@minezzzbobin" }],
    images: [
      img("minezzzbobin-slacking-1", 1200, 900, "#f8f8f8", "漆彈課課前摸魚"),
      img("minezzzbobin-slacking-2", 675, 506, "#f8f8f8", "自然草藥學科：印象很深刻的那道藍光原來是同學在對凝光流露灌注魔力嗎"),
      img("minezzzbobin-slacking-3", 1440, 720, "#f8f8f8", "跑去旁聽文化與象徵研究：旁聽同學們"),
      img("minezzzbobin-slacking-4", 1409, 2000, "#f8f8f8", "跑去旁聽文化與象徵研究：沒有人啊")
    ]
  },
  {
    id: "yehui-52-sketch",
    artists: [{ name: "@yehui_52" }],
    images: [
      img("yehui-52-sketch-1", 1080, 1350, "#f8f8f8")
    ]
  },
  {
    id: "yehui-52-paintball",
    title: "漆彈課",
    artists: [{ name: "@yehui_52" }],
    images: [
      img("yehui-52-paintball-1", 1080, 1350, "#f8f8f8"),
      img("yehui-52-paintball-2", 1080, 1350, "#f8f8f8")
    ]
  },
  {
    id: "aitsuki-yx",
    title: "暑期上課",
    artists: [{ name: "@Aitsuki_yx" }],
    images: [
      img("aitsuki-yx-1", 1600, 1131, "#f8f8f8")
    ]
  },
  {
    id: "mingmiao200933-reunion",
    title: "因為暑期重逢開心到貼貼✨",
    artists: [{ name: "@Mingmiao200933" }],
    images: [
      img("mingmiao200933-reunion-1", 832, 480, "#f8f8f8", "教室的創作發想區截圖")
    ]
  },
  {
    id: "mingmiao200933-classroom",
    title: "進教室的我與隊長的反應",
    artists: [{ name: "@Mingmiao200933" }],
    images: [
      img("mingmiao200933-classroom-1", 1600, 1600, "#f8f8f8")
    ]
  },
  {
    id: "leeanzelo",
    title: "山區夜間導覽課程",
    artists: [{ name: "@LeeAnZelo", url: "https://x.com/LeeAnZelo" }],
    images: [
      img("leeanzelo-1", 727, 491, "#f8f8f8", "老師跟阿巴巴竟對深山神秘的攤位買周邊")
    ]
  },
  {
    id: "bimenzaoju",
    artists: [{ name: "閉門造居" }],
    images: [
      img("bimenzaoju-1", 1375, 780, "#f8f8f8")
    ]
  },
  {
    id: "yuzuki-group-oddities",
    title: "奇物學（柚雪小組）",
    artists: [{ name: "@yuyuki_yuyu" }, { name: "@trip_tong2" }, { name: "@Yuzzka_Chan" }],
    images: [
      img("yuzuki-group-oddities-1", 1600, 1087, "#f8f8f8")
    ]
  },
  {
    id: "yuzuki-group-tentacle",
    title: "觸手課暑假作業",
    artists: [{ name: "@trip_tong2" }, { name: "@yuyuki_yuyu" }, { name: "@Yuzzka_Chan" }],
    images: [
      img("yuzuki-group-tentacle-1", 999, 742, "#d8b898")
    ]
  },
  {
    id: "nt-alpha-hill",
    title: "後山導覽",
    artists: [{ name: "@NT_Alpha", url: "https://x.com/NT_Alpha" }],
    images: [
      img("nt-alpha-hill-1", 593, 472, "#f8f8f8")
    ]
  },
  {
    id: "nt-alpha-service",
    title: "愛校服務",
    artists: [{ name: "@NT_Alpha", url: "https://x.com/NT_Alpha" }],
    images: [
      img("nt-alpha-service-1", 528, 301, "#f8f8f8"),
      img("nt-alpha-service-2", 881, 498, "#f8f8f8", "團隊全圖")
    ]
  },
  {
    id: "aijunart",
    title: "睡覺檔樹陰插圖",
    artists: [{ name: "@Aijunart", url: "https://x.com/Aijunart" }],
    images: [
      img("aijunart-1", 1600, 900, "#f8f8e8")
    ]
  }
];
