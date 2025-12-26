// デフォルトの色
const DEFAULT_COLOR = "#4285f4";

function generateIndexTabId() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  const rand = Math.random().toString(16).slice(2);
  return `it_${Date.now().toString(16)}_${rand}`;
}

function buildIndexTabUrlWithId(indexTabId) {
  const base = chrome.runtime.getURL("tabs.html");
  if (!indexTabId) return base;
  return `${base}?indexTabId=${encodeURIComponent(indexTabId)}`;
}

// 利用可能な色のリスト
const AVAILABLE_COLORS = [
  "#4285f4", // 青
  "#ea4335", // 赤
  "#34a853", // 緑
  "#fbbc04", // 黄
  "#9334e6", // 紫
  "#ff6d01", // オレンジ
  "#46bdc6", // シアン
  "#f439a0", // ピンク
  "#666666", // グレー
];

// 新しいIndex Tabの色を決定する関数
async function getNextIndexTabColor() {
  // 設定を取得
  const result = await chrome.storage.local.get("newIndexTabColor");
  const colorSetting = result.newIndexTabColor || "rotate";

  // 固定色が選択されている場合はそれを返す
  if (colorSetting !== "rotate") {
    return colorSetting;
  }

  // 順番に変える場合：最後に使用した色から次の色を決定
  try {
    // 最後に使用した色を取得
    const lastColorResult = await chrome.storage.local.get(
      "lastUsedIndexTabColor"
    );
    const lastColor =
      lastColorResult.lastUsedIndexTabColor ||
      AVAILABLE_COLORS[AVAILABLE_COLORS.length - 1];

    // 次の色を決定
    const currentIndex = AVAILABLE_COLORS.indexOf(lastColor);
    const nextIndex = (currentIndex + 1) % AVAILABLE_COLORS.length;
    const nextColor = AVAILABLE_COLORS[nextIndex];

    // 次の色を保存
    await chrome.storage.local.set({ lastUsedIndexTabColor: nextColor });

    return nextColor;
  } catch (error) {
    console.error("Error getting next color:", error);
    return DEFAULT_COLOR;
  }
}

async function queryAllTabsForContext() {
  // currentWindow が空になる実装があるため lastFocusedWindow にフォールバック
  const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
  if (currentWindowTabs && currentWindowTabs.length > 0) {
    return currentWindowTabs;
  }
  return await chrome.tabs.query({ lastFocusedWindow: true });
}

async function queryActiveTabForContext() {
  const [currentWindowActive] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (currentWindowActive) return currentWindowActive;

  const [lastFocusedActive] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return lastFocusedActive || null;
}

// Index Tabを作成する共通関数
async function createIndexTab() {
  const currentTab = await queryActiveTabForContext();
  if (currentTab) {
    const indexTabId = generateIndexTabId();
    const newTab = await chrome.tabs.create({
      url: buildIndexTabUrlWithId(indexTabId),
      index: currentTab.index,
    });

    // 新しいタブの色とタイトルを設定
    if (newTab && newTab.id) {
      const keySuffix = indexTabId;
      const colorKey = `tabColor_${keySuffix}`;
      const titleKey = `tabTitle_${keySuffix}`;

      // 設定に基づいて色を決定
      const newColor = await getNextIndexTabColor();

      await chrome.storage.local.set({
        [colorKey]: newColor,
        [titleKey]: "Index Tab",
      });
    }
  }
}

// 左のIndex Tabに移動する関数
async function goToLeftIndexTab() {
  const currentTab = await queryActiveTabForContext();
  if (!currentTab) return;

  // 現在のウィンドウの全タブを取得
  const allTabs = await queryAllTabsForContext();
  const indexTabUrl = chrome.runtime.getURL("tabs.html");

  // 現在のタブより左にあるIndex Tabを探す
  const leftIndexTabs = allTabs.filter(tab =>
    tab.index < currentTab.index && tab.url && tab.url.startsWith(indexTabUrl)
  );

  // 左にあるIndex Tabの中で最も右側（indexが最大）のものをアクティブにする
  if (leftIndexTabs.length > 0) {
    const targetTab = leftIndexTabs[leftIndexTabs.length - 1];
    await chrome.tabs.update(targetTab.id, { active: true });
  }
}

// 右のIndex Tabに移動する関数
async function goToRightIndexTab() {
  const currentTab = await queryActiveTabForContext();
  if (!currentTab) return;

  // 現在のウィンドウの全タブを取得
  const allTabs = await queryAllTabsForContext();
  const indexTabUrl = chrome.runtime.getURL("tabs.html");

  // 現在のタブより右にあるIndex Tabを探す
  const rightIndexTabs = allTabs.filter(tab =>
    tab.index > currentTab.index && tab.url && tab.url.startsWith(indexTabUrl)
  );

  // 右にあるIndex Tabの中で最も左側（indexが最小）のものをアクティブにする
  if (rightIndexTabs.length > 0) {
    const targetTab = rightIndexTabs[0];
    await chrome.tabs.update(targetTab.id, { active: true });
  }
}

// 設定に基づいてパネルの動作を更新
async function updatePanelBehavior() {
  const result = await chrome.storage.local.get('iconClickAction');
  const action = result.iconClickAction || 'createTab';

  // sidePanel API は未対応ブラウザがある（Vivaldi等）ためガード
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) {
    return;
  }

  try {
    if (action === 'openSidePanel') {
      // サイドパネルを開く動作に設定
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } else {
      // 通常の動作（onClickedリスナーが呼ばれる）
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
  } catch (error) {
    console.error('Failed to set panel behavior:', error);
  }
}

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(async (tab) => {
  // サイドパネルを開く設定の場合はsetPanelBehaviorで処理されるため、
  // ここではタブ作成の場合のみ実行される
  const baseTab = tab || (await queryActiveTabForContext());
  const index = baseTab && typeof baseTab.index === 'number' ? baseTab.index : 0;

  const indexTabId = generateIndexTabId();

  const newTab = await chrome.tabs.create({
    url: buildIndexTabUrlWithId(indexTabId),
    index,
  });

  // 新しいタブの色とタイトルを設定
  if (newTab && newTab.id) {
    const keySuffix = indexTabId;
    const colorKey = `tabColor_${keySuffix}`;
    const titleKey = `tabTitle_${keySuffix}`;

    // 設定に基づいて色を決定
    const newColor = await getNextIndexTabColor();

    await chrome.storage.local.set({
      [colorKey]: newColor,
      [titleKey]: "Index Tab",
    });
  }
});

// ストレージの変更を監視して設定が変わったらパネルの動作を更新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.iconClickAction) {
    updatePanelBehavior();
  }
});

// 拡張機能インストール/起動時に設定を読み込んで適用
chrome.runtime.onInstalled.addListener(() => {
  updatePanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  updatePanelBehavior();
});

// ショートカットキーが押されたときの処理
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "create-index-tab") {
    await createIndexTab();
  } else if (command === "go-to-left-index-tab") {
    await goToLeftIndexTab();
  } else if (command === "go-to-right-index-tab") {
    await goToRightIndexTab();
  }
});
