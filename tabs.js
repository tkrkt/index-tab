// 現在のタブを取得する関数（サイドパネル対応）
// サイドパネル: 現在アクティブなタブ
// Index Tabページ: 自分自身
async function queryAllTabsForContext() {
  // Index Tabページ（通常タブ）では currentWindow が期待通り動く
  const currentTab = await chrome.tabs.getCurrent();
  if (currentTab) {
    return await chrome.tabs.query({ currentWindow: true });
  }

  // サイドパネルではブラウザ実装によって currentWindow が空になることがあるため、
  // lastFocusedWindow へフォールバックする（Vivaldi等）
  const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
  if (currentWindowTabs && currentWindowTabs.length > 0) {
    return currentWindowTabs;
  }

  return await chrome.tabs.query({ lastFocusedWindow: true });
}

async function queryActiveTabForContext() {
  const currentTab = await chrome.tabs.getCurrent();
  if (currentTab) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  }

  // サイドパネル: currentWindow が空になる可能性があるためフォールバック
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

async function getCurrentTab() {
  // まずgetCurrent()を試す
  const currentTab = await chrome.tabs.getCurrent();

  if (currentTab) {
    // Index Tabページの場合
    return currentTab;
  } else {
    // サイドパネルの場合（getCurrent()がnullを返す）
    return await queryActiveTabForContext();
  }
}

// 現在のIndex Tabページを取得する関数（サイドパネル対応）
// サイドパネル: アクティブなタブより左側の最も近いIndex Tab
// Index Tabページ: 自分自身
async function getCurrentIndexTab() {
  // まずgetCurrent()を試す
  const currentTab = await chrome.tabs.getCurrent();

  if (currentTab) {
    // Index Tabページの場合は自分自身を返す
    return currentTab;
  } else {
    // サイドパネルの場合：アクティブなタブより左側の最も近いIndex Tabを探す
    const activeTab = await queryActiveTabForContext();
    if (!activeTab) return null;

    const allTabs = await queryAllTabsForContext();

    // アクティブなタブ自身、またはそれより左側のIndex Tabを探す
    let leftIndexTab = null;
    for (let i = activeTab.index; i >= 0; i--) {
      const tab = allTabs[i];
      if (tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))) {
        leftIndexTab = tab;
        break;
      }
    }

    return leftIndexTab;
  }
}

// i18n対応: HTMLの要素を翻訳する関数
function initI18n() {
  // data-i18n属性を持つ要素のテキストコンテンツを翻訳
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });

  // data-i18n-title属性を持つ要素のtitle属性を翻訳
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.getAttribute("data-i18n-title");
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.title = message;
    }
  });

  // data-i18n-placeholder属性を持つ要素のplaceholder属性を翻訳
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.placeholder = message;
    }
  });

  // ページタイトルを翻訳
  const pageTitle = chrome.i18n.getMessage("pageTitle");
  if (pageTitle) {
    document.title = pageTitle;
  }

  // HTMLのlang属性を設定
  const uiLanguage = chrome.i18n.getUILanguage();
  document.documentElement.lang = uiLanguage.startsWith("ja") ? "ja" : "en";
}

// デフォルトの色
const DEFAULT_COLOR = "#4285f4";

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

// ファビコンを設定する関数
function setFavicon(color) {
  const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="2" y="2" width="96" height="96" rx="18" fill="${encodeURIComponent(
      color
    )}"/>
    <line x1="23" y1="15" x2="23" y2="85" stroke="white" stroke-width="11" stroke-linecap="round"/>
    <path d="M 38 50 L 75 50 M 75 50 L 63 36 M 75 50 L 63 64" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    document.head.appendChild(link);
  }
  link.href = svg;
}

// 背景色を設定する関数
function setBackgroundColor(color) {
  // 16進数カラーをRGBに変換
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 非常に薄い背景色に設定（透明度0.05）
  document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
}

// 色を保存する関数
async function saveColor(color) {
  const thisTab = await getCurrentIndexTab();

  if (thisTab && thisTab.id) {
    // タブIDをキーにして色を保存
    const key = `tabColor_${thisTab.id}`;
    await chrome.storage.local.set({ [key]: color });
  }
}

// 色を読み込む関数
async function loadColor() {
  const thisTab = await getCurrentIndexTab();

  if (thisTab && thisTab.id) {
    const key = `tabColor_${thisTab.id}`;
    const result = await chrome.storage.local.get(key);
    const color = result[key];

    console.log("color key:", key, "value:", color);

    // ストレージに値がない場合はデフォルト値を保存
    if (!color) {
      await chrome.storage.local.set({ [key]: DEFAULT_COLOR });
      return DEFAULT_COLOR;
    }

    return color;
  }
  return DEFAULT_COLOR;
}

// 色のUIを更新する共通関数
function updateColorUI(color) {
  // ファビコンを変更
  setFavicon(color);

  // 背景色を変更
  setBackgroundColor(color);

  // 通常のカラーピッカーのアクティブ状態を更新
  const colorButtons = document.querySelectorAll(".color-button");
  colorButtons.forEach((btn) => {
    if (btn.dataset.color === color) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // ドロップダウンのカラーピッカーのアクティブ状態を更新
  const colorButtonsDropdown = document.querySelectorAll(
    ".color-button-dropdown"
  );
  colorButtonsDropdown.forEach((btn) => {
    if (btn.dataset.color === color) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // ドロップダウンのインジケーターを更新
  const colorIndicator = document.getElementById("colorIndicator");
  if (colorIndicator) {
    colorIndicator.style.backgroundColor = color;
  }
}

// 色選択ボタンのセットアップ
function setupColorPicker() {
  const colorButtons = document.querySelectorAll(".color-button");

  // 初期色を読み込んでUIを設定
  loadColor().then((savedColor) => {
    updateColorUI(savedColor);
  });

  // 各ボタンにクリックイベントを設定
  colorButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const color = button.dataset.color;

      // UIを更新
      updateColorUI(color);

      // 色を保存
      await saveColor(color);
    });
  });
}

// カラーピッカードロップダウンのセットアップ
let colorPickerDropdownInitialized = false;

function setupColorPickerDropdown() {
  const dropdownButton = document.getElementById("colorPickerDropdownButton");
  const dropdownMenu = document.getElementById("colorPickerDropdownMenu");
  const colorIndicator = document.getElementById("colorIndicator");
  const colorButtons = document.querySelectorAll(".color-button-dropdown");

  if (!dropdownButton || !dropdownMenu || !colorIndicator) return;

  // 初期色を読み込んで表示
  loadColor().then((savedColor) => {
    updateColorUI(savedColor);
  });

  // イベントリスナーは一度だけ登録
  if (colorPickerDropdownInitialized) return;
  colorPickerDropdownInitialized = true;

  // ドロップダウンボタンのクリック
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("colorPickerDropdownMenu");
    const button = document.getElementById("colorPickerDropdownButton");
    if (!menu || !button) return;

    const isOpen = menu.classList.contains("show");
    if (isOpen) {
      menu.classList.remove("show");
      button.classList.remove("active");
    } else {
      menu.classList.add("show");
      button.classList.add("active");
    }
  });

  // 色ボタンのクリック（イベント委譲を使用）
  dropdownMenu.addEventListener("click", async (e) => {
    const button = e.target.closest(".color-button-dropdown");
    if (!button) return;

    e.stopPropagation();
    const color = button.dataset.color;

    // UIを更新
    updateColorUI(color);

    // 色を保存
    await saveColor(color);

    // メニューを閉じる
    const menu = document.getElementById("colorPickerDropdownMenu");
    const dropdownBtn = document.getElementById("colorPickerDropdownButton");
    if (menu) menu.classList.remove("show");
    if (dropdownBtn) dropdownBtn.classList.remove("active");
  });

  // 外側をクリックしたらメニューを閉じる
  document.addEventListener("click", () => {
    const menu = document.getElementById("colorPickerDropdownMenu");
    const button = document.getElementById("colorPickerDropdownButton");
    if (menu && menu.classList.contains("show")) {
      menu.classList.remove("show");
      if (button) button.classList.remove("active");
    }
  });
}

// タイトルを保存する関数
async function saveTitle(title) {
  const thisTab = await getCurrentIndexTab();

  if (thisTab && thisTab.id) {
    const key = `tabTitle_${thisTab.id}`;
    await chrome.storage.local.set({ [key]: title });
  }
}

// タイトルのUIを更新する共通関数
function updateTitleUI(title) {
  const titleInput = document.getElementById("pageTitle");
  if (titleInput) {
    // 入力中（フォーカスがある場合）は更新しない
    // これにより、ユーザーが入力中に他のタブからの更新で邪魔されることを防ぐ
    if (document.activeElement === titleInput) {
      return;
    }

    // 値が異なる場合のみ更新
    if (titleInput.value !== title) {
      titleInput.value = title;
    }
  }

  // ページタイトルも更新
  document.title = title;
}

// タイトルを読み込む関数
async function loadTitle() {
  const thisTab = await getCurrentIndexTab();

  if (thisTab && thisTab.id) {
    const key = `tabTitle_${thisTab.id}`;
    const result = await chrome.storage.local.get(key);
    const title = result[key];

    // ストレージに値がない場合はデフォルト値を保存
    if (!title) {
      const defaultTitle =
        chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";
      await chrome.storage.local.set({ [key]: defaultTitle });
      return defaultTitle;
    }

    return title;
  }
  return chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";
}

// ページタイトルの編集機能をセットアップ
async function setupTitleEditor() {
  const titleInput = document.getElementById("pageTitle");

  if (!titleInput) return;

  // 保存されたタイトルを読み込む
  const savedTitle = await loadTitle();
  updateTitleUI(savedTitle);

  let saveTitleTimeout = null;

  let isComposing = false;

  const handleInput = () => {
    // IME変換中は無視
    if (isComposing) {
      return;
    }

    const defaultTitle =
      chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";
    const newTitle = titleInput.value || defaultTitle;
    document.title = newTitle;

    // デバウンス処理：入力が止まってから300ms後に保存
    if (saveTitleTimeout) {
      clearTimeout(saveTitleTimeout);
    }
    saveTitleTimeout = setTimeout(async () => {
      await saveTitle(newTitle);
    }, 300);
  };

  titleInput.addEventListener("compositionstart", () => {
    isComposing = true;
    console.log("compositionstart");
  });

  titleInput.addEventListener("compositionend", () => {
    isComposing = false;
    // fallback: compositionend後にタイトルを保存
    handleInput();
  });

  // タイトル変更時にページタイトルを更新
  titleInput.addEventListener("input", handleInput);
}

// メニュードロップダウンの機能をセットアップ
function setupMenuDropdown() {
  const dropdownButton = document.getElementById("menuDropdownButton");
  const dropdownMenu = document.getElementById("menuDropdownMenu");
  const dropdownItems = document.querySelectorAll(".menu-dropdown-item");

  if (!dropdownButton || !dropdownMenu) return;

  // ドロップダウンボタンのクリック
  dropdownButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.contains("show");
    if (isOpen) {
      dropdownMenu.classList.remove("show");
      dropdownButton.classList.remove("active");
    } else {
      dropdownMenu.classList.add("show");
      dropdownButton.classList.add("active");
    }
  });

  // メニューアイテムのクリック
  dropdownItems.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;

      // メニューを閉じる
      dropdownMenu.classList.remove("show");
      dropdownButton.classList.remove("active");

      if (action === "toggle-sidepanel") {
        // サイドパネルを開く
        try {
          if (!chrome.sidePanel || !chrome.sidePanel.open) {
            throw new Error("sidePanel API is not available");
          }
          const window = await chrome.windows.getCurrent();
          await chrome.sidePanel.open({ windowId: window.id });
        } catch (error) {
          console.error("Failed to open side panel:", error);
        }
      } else if (action === "close-tab") {
        // このIndex Tabのみを閉じる
        await closeCurrentIndexTab();
      } else if (action === "close-all") {
        // 確認ダイアログを表示
        const confirmMessage = chrome.i18n.getMessage("confirmCloseAll");
        const confirmed = confirm(confirmMessage);
        if (confirmed) {
          await closeCurrentIndexTabAndChildren();
        }
      }
    });
  });

  // 外側をクリックしたらメニューを閉じる
  document.addEventListener("click", () => {
    if (dropdownMenu.classList.contains("show")) {
      dropdownMenu.classList.remove("show");
      dropdownButton.classList.remove("active");
    }
  });
}

// 設定モーダルのセットアップ
function setupSettingsPopup() {
  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("settingsModal");
  const settingsPopup = document.getElementById("settingsPopup");
  const closeButton = document.getElementById("closeSettingsButton");
  const iconClickActionSelect = document.getElementById("iconClickAction");
  const newIndexTabColorSelect = document.getElementById("newIndexTabColor");

  if (
    !settingsButton ||
    !settingsModal ||
    !settingsPopup ||
    !closeButton ||
    !iconClickActionSelect ||
    !newIndexTabColorSelect
  )
    return;

  // 設定ボタンクリックでモーダルを開く
  settingsButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    // 設定を読み込む
    await loadSettings();
    settingsModal.classList.add("show");
  });

  // 閉じるボタンクリックでモーダルを閉じる
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsModal.classList.remove("show");
  });

  // モーダル背景（オーバーレイ）をクリックしたら閉じる
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("show");
    }
  });

  // ポップアップ内クリックは伝播を止める（モーダルが閉じないように）
  settingsPopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // 設定変更時に保存
  iconClickActionSelect.addEventListener("change", async (e) => {
    const action = e.target.value;
    await chrome.storage.local.set({ iconClickAction: action });
  });

  // 新しいIndex Tabの色設定変更時に保存
  newIndexTabColorSelect.addEventListener("change", async (e) => {
    const color = e.target.value;
    await chrome.storage.local.set({ newIndexTabColor: color });
  });
}

// 設定を読み込む
async function loadSettings() {
  const iconClickActionSelect = document.getElementById("iconClickAction");
  const newIndexTabColorSelect = document.getElementById("newIndexTabColor");

  if (!iconClickActionSelect || !newIndexTabColorSelect) return;

  // ストレージから設定を取得
  const result = await chrome.storage.local.get([
    "iconClickAction",
    "newIndexTabColor",
  ]);
  const action = result.iconClickAction || "createTab"; // デフォルトはタブ作成
  const color = result.newIndexTabColor || "rotate"; // デフォルトは順番に変える

  // selectの値を設定
  iconClickActionSelect.value = action;
  newIndexTabColorSelect.value = color;
}

// 現在のIndex Tabのみを閉じる
async function closeCurrentIndexTab() {
  try {
    const thisTab = await getCurrentIndexTab();
    if (!thisTab || !thisTab.id) return;

    // 閉じる前に左側の最も近いIndex Tabをアクティブにする
    await activateLeftIndexTab(thisTab);

    // タブを閉じる
    await chrome.tabs.remove(thisTab.id);
  } catch (error) {
    console.error("Index Tabの削除に失敗しました:", error);
  }
}

// 現在のIndex Tabとその配下のすべてのタブを閉じる
async function closeCurrentIndexTabAndChildren() {
  try {
    const thisTab = await getCurrentIndexTab();
    if (!thisTab || !thisTab.id) return;

    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 閉じるタブのIDリストを作成
    const tabIdsToClose = [thisTab.id];

    // このIndex Tabの配下のタブを見つける
    for (let i = thisTab.index + 1; i < allTabs.length; i++) {
      const tab = allTabs[i];
      // 次のIndex Tabが見つかったら終了
      if (tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))) {
        break;
      }
      tabIdsToClose.push(tab.id);
    }

    // 閉じる前に左側の最も近いIndex Tabをアクティブにする
    await activateLeftIndexTab(thisTab);

    // すべてのタブを閉じる
    await chrome.tabs.remove(tabIdsToClose);
  } catch (error) {
    console.error("タブの削除に失敗しました:", error);
  }
}

// 左側の最も近いIndex Tabをアクティブにする
async function activateLeftIndexTab(currentTab) {
  try {
    const allTabs = await queryAllTabsForContext();

    // 現在のタブより左側のIndex Tabを探す
    let leftIndexTab = null;
    for (let i = currentTab.index - 1; i >= 0; i--) {
      const tab = allTabs[i];
      if (tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))) {
        leftIndexTab = tab;
        break;
      }
    }

    // 左側にIndex Tabがあればアクティブにする
    if (leftIndexTab) {
      await activateTab(leftIndexTab.id);
    }
  } catch (error) {
    console.error("Index Tabのアクティブ化に失敗しました:", error);
  }
}

let updatingIndexTabBar = false;
let lastIndexTabsState = null; // 前回のタブ状態をキャッシュ

// Index Tabタブバーの表示を更新
async function updateIndexTabBar() {
  // 既に更新中の場合はスキップ
  if (updatingIndexTabBar) {
    return;
  }

  const tabBar = document.getElementById("indexTabBar");
  if (!tabBar) return;

  updatingIndexTabBar = true;

  try {
    // サイドパネルかどうかを判定
    const currentTab = await chrome.tabs.getCurrent();
    let thisTab;

    if (!currentTab) {
      // サイドパネルの場合は、getCurrentIndexTab()で基準となるIndex Tabを取得
      thisTab = await getCurrentIndexTab();
      // thisTabがnullでも処理を続ける（すべてのIndex TabをisActive=falseで表示）
    } else {
      // Index Tabページの場合は「このページ自身がアクティブか」をIDで判定
      // urlフィルタは実装差があるため避ける
      const activeTab = await queryActiveTabForContext();
      if (!activeTab || activeTab.id !== currentTab.id) {
        return;
      }
      thisTab = currentTab;
    }

    const allTabs = await queryAllTabsForContext();

    // このウィンドウ内のすべてのIndex Tabページを取得
    const indexTabs = allTabs.filter(
      (tab) => tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))
    );

    // 各タブの色とタイトルを取得して状態を作成
    const indexTabsData = [];
    for (const indexTab of indexTabs) {
      const colorKey = `tabColor_${indexTab.id}`;
      const colorResult = await chrome.storage.local.get(colorKey);
      const color = colorResult[colorKey] || DEFAULT_COLOR;

      const titleKey = `tabTitle_${indexTab.id}`;
      const titleResult = await chrome.storage.local.get(titleKey);
      const defaultTitle =
        chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";
      const title = titleResult[titleKey] || defaultTitle;

      // このIndexTabの右側にあるタブ数をカウント
      const indexTabPosition = allTabs.findIndex((t) => t.id === indexTab.id);
      let tabCount = 0;
      if (indexTabPosition !== -1) {
        // 次のIndexTabまでのタブ数をカウント
        for (let i = indexTabPosition + 1; i < allTabs.length; i++) {
          const tab = allTabs[i];
          if (
            tab.url &&
            tab.url.startsWith(chrome.runtime.getURL("tabs.html"))
          ) {
            break; // 次のIndexTabが見つかったら終了
          }
          tabCount++;
        }
      }

      indexTabsData.push({
        id: indexTab.id,
        index: indexTab.index,
        color: color,
        title: title,
        isActive: thisTab ? indexTab.id === thisTab.id : false,
        tabCount: tabCount,
      });
    }

    // 前回の状態と比較
    const currentState = JSON.stringify(indexTabsData);
    if (lastIndexTabsState === currentState) {
      // 変更がない場合は何もしない
      return;
    }

    // 状態を更新
    lastIndexTabsState = currentState;

    // タブバーをクリア
    tabBar.innerHTML = "";

    // タブバーにタブがない場合（Index Tabが0件）は案内を表示
    if (indexTabsData.length === 0) {
      const message =
        chrome.i18n.getMessage("noIndexTabBarMessage") ||
        "Index Tabがありません";
      const emptyElement = document.createElement("div");
      emptyElement.className = "index-tab-bar-empty";
      emptyElement.textContent = message;
      tabBar.appendChild(emptyElement);
      return;
    }

    // 各Index Tabページのタブを作成
    for (const tabData of indexTabsData) {
      const tabElement = document.createElement("div");
      tabElement.className = "index-tab";
      tabElement.dataset.tabId = tabData.id;
      tabElement.dataset.tabIndex = tabData.index;

      // アクティブなIndex Tabのみドラッグ可能にする
      if (tabData.isActive) {
        tabElement.classList.add("active");
        tabElement.draggable = true;
      } else {
        tabElement.draggable = false;
      }

      const faviconSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="2" y="2" width="96" height="96" rx="18" fill="${encodeURIComponent(
          tabData.color
        )}"/>
        <line x1="23" y1="15" x2="23" y2="85" stroke="white" stroke-width="11" stroke-linecap="round"/>
        <path d="M 38 50 L 75 50 M 75 50 L 63 36 M 75 50 L 63 64" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`;

      const favicon = document.createElement("img");
      favicon.className = "index-tab-favicon";
      favicon.src = faviconSvg;

      const titleElement = document.createElement("span");
      titleElement.className = "index-tab-title";
      titleElement.textContent = tabData.title;

      // バッジを作成（常に表示）
      const badge = document.createElement("span");
      badge.className = "index-tab-badge";
      badge.textContent = tabData.tabCount;
      badge.title = tabData.title;
      badge.style.backgroundColor = tabData.color;

      tabElement.appendChild(favicon);
      tabElement.appendChild(titleElement);
      tabElement.appendChild(badge);

      // クリックでそのIndex Tabに切り替え
      const targetTabId = tabData.id;
      tabElement.addEventListener("click", async (e) => {
        // ドラッグ中は無視
        if (tabElement.classList.contains("drag-over")) return;
        await activateTab(targetTabId);
      });

      // アクティブなIndex Tabの場合のみ、ドラッグ&ドロップイベントを設定
      if (tabData.isActive) {
        // ドラッグ開始イベント
        tabElement.addEventListener("dragstart", (e) => {
          tabElement.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `indextab-${tabData.id}`);
        });

        // ドラッグ終了イベント
        tabElement.addEventListener("dragend", () => {
          tabElement.classList.remove("dragging");
          // すべてのドラッグオーバー表示をクリア
          document.querySelectorAll(".index-tab").forEach((item) => {
            item.classList.remove("drag-over-left", "drag-over-right");
          });
        });
      }

      // すべてのIndex Tabタブでドロップを受け入れる
      tabElement.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragData = e.dataTransfer.types.includes("text/plain");
        if (!dragData) return;

        // dragstartでセットしたデータは取得できないが、effectAllowedで判定できる
        // または、ドラッグ中の要素が.draggingクラスを持つかで判定
        const draggingIndexTab = document.querySelector(".index-tab.dragging");

        if (draggingIndexTab) {
          // Index Tabの並び替え: タブの間に線を表示
          tabElement.classList.remove("drag-over-tab");
          const rect = tabElement.getBoundingClientRect();
          const midpoint = rect.left + rect.width / 2;

          if (e.clientX < midpoint) {
            tabElement.classList.add("drag-over-left");
            tabElement.classList.remove("drag-over-right");
          } else {
            tabElement.classList.add("drag-over-right");
            tabElement.classList.remove("drag-over-left");
          }
        } else {
          // 通常タブのドラッグ: タブ全体を強調表示
          tabElement.classList.remove("drag-over-left", "drag-over-right");
          tabElement.classList.add("drag-over-tab");
        }

        e.dataTransfer.dropEffect = "move";
      });

      tabElement.addEventListener("dragleave", () => {
        tabElement.classList.remove(
          "drag-over-left",
          "drag-over-right",
          "drag-over-tab"
        );
      });

      // ドロップイベント
      tabElement.addEventListener("drop", async (e) => {
        e.preventDefault();
        tabElement.classList.remove(
          "drag-over-left",
          "drag-over-right",
          "drag-over-tab"
        );

        const draggedData = e.dataTransfer.getData("text/plain");

        // Index Tabのドラッグかどうかを判定
        if (draggedData.startsWith("indextab-")) {
          const draggedTabId = parseInt(draggedData.replace("indextab-", ""));
          if (!draggedTabId || draggedTabId === targetTabId) return;

          try {
            // ドロップ位置を判定
            const rect = tabElement.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const dropToLeft = e.clientX < midpoint;

            // Index Tabとその配下のタブをまとめて移動
            await moveIndexTabGroup(draggedTabId, targetTabId, dropToLeft);
          } catch (error) {
            console.error("Index Tabの移動に失敗しました:", error);
          }
        } else {
          // 通常のタブのドロップ処理（既存の処理）
          const draggedTabId = parseInt(draggedData);
          if (!draggedTabId) return;

          try {
            const draggedTab = await chrome.tabs.get(draggedTabId);

            // このIndex Tabの配下の末尾に移動
            let newIndex = targetTabIndex + 1;
            for (let i = targetTabIndex + 1; i < allTabs.length; i++) {
              const tab = allTabs[i];
              if (
                tab.url &&
                tab.url.startsWith(chrome.runtime.getURL("tabs.html"))
              ) {
                // 次のIndex Tabが見つかった場合、その直前に挿入
                // draggedTabが現在より後ろにある場合は、移動後にインデックスがずれるので調整不要
                // draggedTabが現在より前にある場合は、移動後にインデックスが1つ前にずれる
                if (draggedTab.index < tab.index) {
                  newIndex = tab.index - 1;
                } else {
                  newIndex = tab.index;
                }
                break;
              }
              newIndex = tab.index + 1;
            }

            await chrome.tabs.move(draggedTabId, { index: newIndex });
          } catch (error) {
            console.error("タブの移動に失敗しました:", error);
          }
        }
      });

      tabBar.appendChild(tabElement);
    }
  } catch (error) {
    console.error("タブバーの更新に失敗しました:", error);
  } finally {
    updatingIndexTabBar = false;
  }
}

let scheduledIndexTabBarUpdateTimer = null;
function scheduleUpdateIndexTabBar(delayMs = 50) {
  if (scheduledIndexTabBarUpdateTimer) {
    clearTimeout(scheduledIndexTabBarUpdateTimer);
  }
  scheduledIndexTabBarUpdateTimer = setTimeout(() => {
    scheduledIndexTabBarUpdateTimer = null;
    updateIndexTabBar().catch((error) => {
      console.error("タブバーの更新に失敗しました:", error);
    });
  }, delayMs);
}

// Index Tabページ間のナビゲーション機能をセットアップ
let indexNavigationInitialized = false;

function setupIndexNavigation() {
  // 初期表示
  updateIndexTabBar();

  // リスナーは一度だけ登録
  if (!indexNavigationInitialized) {
    indexNavigationInitialized = true;

    // タブの変更時に更新
    chrome.tabs.onActivated.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onCreated.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onRemoved.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onMoved.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onUpdated.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onAttached.addListener(() => scheduleUpdateIndexTabBar());
    chrome.tabs.onDetached.addListener(() => scheduleUpdateIndexTabBar());

    // ストレージの変更時にも更新（色やタイトルが変更された時）
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === "local") {
        // Index Tabバーを更新
        scheduleUpdateIndexTabBar();

        // 現在のIndex Tabの色やタイトルが変更された場合、UIを更新
        const thisTab = await getCurrentIndexTab();
        if (thisTab && thisTab.id) {
          const colorKey = `tabColor_${thisTab.id}`;
          const titleKey = `tabTitle_${thisTab.id}`;

          // 色の変更を検知
          if (changes[colorKey]) {
            const newColor = changes[colorKey].newValue;
            if (newColor) {
              updateColorUI(newColor);
            }
          }

          // タイトルの変更を検知
          if (changes[titleKey]) {
            const newTitle = changes[titleKey].newValue;
            if (newTitle) {
              updateTitleUI(newTitle);
            }
          }
        }
      }
    });
  }
}

// 拡張機能のタブかどうかを判定する関数
function isExtensionTab(url) {
  return url && url.startsWith(chrome.runtime.getURL(""));
}

// Index Tabグループ（Index Tabとその配下のタブ）を移動する関数
async function moveIndexTabGroup(
  draggedIndexTabId,
  targetIndexTabId,
  insertBefore
) {
  try {
    // 全タブを取得
    const allTabs = await queryAllTabsForContext();

    // ドラッグされたIndex Tabとターゲットのインデックスを取得
    const draggedIndexTab = allTabs.find((t) => t.id === draggedIndexTabId);
    const targetIndexTab = allTabs.find((t) => t.id === targetIndexTabId);

    if (!draggedIndexTab || !targetIndexTab) return;

    // ドラッグされたIndex Tabの配下のタブを取得
    const draggedGroupTabs = [];
    draggedGroupTabs.push(draggedIndexTab);

    for (let i = draggedIndexTab.index + 1; i < allTabs.length; i++) {
      const tab = allTabs[i];
      if (tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))) {
        break; // 次のIndex Tabが見つかったら終了
      }
      draggedGroupTabs.push(tab);
    }

    // 挿入先のインデックスを計算
    let insertIndex;
    if (insertBefore) {
      // ターゲットの左側に挿入
      insertIndex = targetIndexTab.index;
    } else {
      // ターゲットの右側（配下の末尾）に挿入
      // ターゲットの配下の最後のタブを探す
      let lastTabIndex = targetIndexTab.index;
      for (let i = targetIndexTab.index + 1; i < allTabs.length; i++) {
        const tab = allTabs[i];
        if (tab.url && tab.url.startsWith(chrome.runtime.getURL("tabs.html"))) {
          break; // 次のIndex Tabが見つかったら終了
        }
        lastTabIndex = tab.index;
      }
      insertIndex = lastTabIndex + 1;
    }

    // 移動方向によって処理を変える
    if (draggedIndexTab.index < insertIndex) {
      // 右方向への移動：後ろから順に移動
      const targetIndex = insertIndex - draggedGroupTabs.length;
      for (let i = draggedGroupTabs.length - 1; i >= 0; i--) {
        await chrome.tabs.move(draggedGroupTabs[i].id, {
          index: targetIndex + i,
        });
      }
    } else {
      // 左方向への移動：前から順に移動
      for (let i = 0; i < draggedGroupTabs.length; i++) {
        await chrome.tabs.move(draggedGroupTabs[i].id, {
          index: insertIndex + i,
        });
      }
    }

    // タブの移動が完全に反映されるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // キャッシュをクリアして強制的に更新
    lastIndexTabsState = null;
    await updateIndexTabBar();
  } catch (error) {
    console.error("Index Tabグループの移動に失敗しました:", error);
  }
} // 右側のタブを取得する関数
async function getRightTabs() {
  try {
    // このIndex Tab自身の情報を取得
    const thisTab = await getCurrentIndexTab();
    if (!thisTab) {
      // サイドパネルで「左にIndex Tabがない」場合は、
      // 最左のIndex Tabより左にあるタブ一覧を表示する。
      // Index Tabが1つもない場合は、すべてのタブを表示する。
      const currentTab = await chrome.tabs.getCurrent();

      // Index Tabページ側（getCurrent()が取れる）では従来通り
      if (currentTab) {
        hideHeaderForCurrentTabList = false;
        return [];
      }

      hideHeaderForCurrentTabList = true;
      const allTabs = await queryAllTabsForContext();
      const indexTabUrlPrefix = chrome.runtime.getURL("tabs.html");
      const leftmostIndexTab = allTabs.find(
        (tab) => tab.url && tab.url.startsWith(indexTabUrlPrefix)
      );

      if (!leftmostIndexTab) {
        return allTabs;
      }

      return allTabs.filter((tab) => tab.index < leftmostIndexTab.index);
    }

    hideHeaderForCurrentTabList = false;

    // 同じウィンドウのすべてのタブを取得
    const allTabs = await queryAllTabsForContext();

    // このタブのインデックスを取得
    const currentIndex = thisTab.index;

    // 右側のタブをフィルタリング
    const rightTabs = allTabs.filter((tab) => tab.index > currentIndex);

    // 右側に別の拡張機能タブがある場合、そこまでに制限
    const nextExtensionTabIndex = rightTabs.findIndex((tab) =>
      isExtensionTab(tab.url)
    );

    if (nextExtensionTabIndex !== -1) {
      return rightTabs.slice(0, nextExtensionTabIndex);
    }

    return rightTabs;
  } catch (error) {
    console.error("タブの取得に失敗しました:", error);
    return [];
  }
}

// タブをアクティブにする関数
async function activateTab(tabId) {
  try {
    // サイドパネルからのタブ切り替えは、ブラウザによってはフォーカスが当たらず
    // 「効かない」ように見えることがあるため、ウィンドウも明示的にフォーカスする
    const currentTab = await chrome.tabs.getCurrent();
    if (!currentTab) {
      const tab = await chrome.tabs.get(tabId);
      if (tab && typeof tab.windowId === "number") {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    }
    await chrome.tabs.update(tabId, { active: true });
  } catch (error) {
    console.error("タブの切り替えに失敗しました:", error);
  }
}

// タブを閉じる関数
async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error("タブの削除に失敗しました:", error);
  }
}

// タブを移動する関数
async function moveTab(tabId, newIndex) {
  try {
    await chrome.tabs.move(tabId, { index: newIndex });
  } catch (error) {
    console.error("タブの移動に失敗しました:", error);
  }
}

// 指定されたタブの直後に新規タブを作成する関数
async function createNewTabAfter(tabId, tabIndex) {
  try {
    // 現在のタブ情報を取得
    const allTabs = await queryAllTabsForContext();
    const targetTab = allTabs.find((t) => t.id === tabId);

    if (!targetTab) return;

    // ターゲットタブの直後の位置に新規タブを作成
    const newTab = await chrome.tabs.create({
      index: targetTab.index + 1,
      active: true, // 新規タブをアクティブにする
    });
  } catch (error) {
    console.error("新規タブの作成に失敗しました:", error);
  }
}

// 一番左にIndex Tabを作成する関数
async function createIndexTabAtStart() {
  try {
    // インデックス0の位置に新しいIndex Tabページを作成
    const newTab = await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs.html"),
      index: 0,
      active: true, // アクティブにする
    });

    // 新しいタブのストレージをデフォルト値で初期化
    if (newTab && newTab.id) {
      const colorKey = `tabColor_${newTab.id}`;
      const titleKey = `tabTitle_${newTab.id}`;
      const defaultTitle =
        chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";

      // 設定に基づいて色を決定
      const newColor = await getNextIndexTabColor();

      await chrome.storage.local.set({
        [colorKey]: newColor,
        [titleKey]: defaultTitle,
      });
    }

    // タブ作成が完全に反映されるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // キャッシュをクリアして強制的に更新
    lastIndexTabsState = null;
    await updateIndexTabBar();
  } catch (error) {
    console.error("Index Tabの作成に失敗しました:", error);
  }
}

// 現在位置にIndex Tabを作成する関数
async function createIndexTabAtCurrentPosition() {
  try {
    // 現在アクティブなタブの位置を取得
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab) return;

    // アクティブなタブと同じ位置に新しいIndex Tabページを作成
    const newTab = await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs.html"),
      index: activeTab.index,
      active: true, // アクティブにする
    });

    // 新しいタブのストレージをデフォルト値で初期化
    if (newTab && newTab.id) {
      const colorKey = `tabColor_${newTab.id}`;
      const titleKey = `tabTitle_${newTab.id}`;
      const defaultTitle =
        chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";

      // 設定に基づいて色を決定
      const newColor = await getNextIndexTabColor();

      await chrome.storage.local.set({
        [colorKey]: newColor,
        [titleKey]: defaultTitle,
      });
    }

    // タブ作成が完全に反映されるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // キャッシュをクリアして強制的に更新
    lastIndexTabsState = null;
    await updateIndexTabBar();
  } catch (error) {
    console.error("Index Tabの作成に失敗しました:", error);
  }
}

// タブリストを表示する関数
let draggedElement = null; // ドラッグ中の要素を保持

// 現在のタブ一覧表示でヘッダーを隠すか（サイドパネルでIndex Tabが左に無いケース用）
let hideHeaderForCurrentTabList = false;

function displayTabs(tabs) {
  const tabListElement = document.getElementById("tabList");
  const headerElement = document.querySelector(".header");

  // ヘッダー表示制御（サイドパネルでIndex Tabが左に無いケースでは非表示）
  if (headerElement) {
    headerElement.style.display = hideHeaderForCurrentTabList ? "none" : "";
  }

  // 旧ロジック互換: 万が一 null が来た場合は空配列扱い
  if (tabs === null) {
    tabs = [];
  }

  if (tabs.length === 0) {
    const emptyMessage = chrome.i18n.getMessage("emptyMessage");
    tabListElement.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  tabListElement.innerHTML = "";

  tabs.forEach((tab, index) => {
    const tabItem = document.createElement("div");
    tabItem.className = "tab-item";
    // アクティブなタブの場合はクラスを追加
    if (tab.active) {
      tabItem.classList.add("active-tab");
    }
    tabItem.dataset.tabId = tab.id;
    tabItem.dataset.tabIndex = index;
    tabItem.dataset.pinned = tab.pinned; // 固定タブかどうかを記録
    tabItem.draggable = false; // アイテム自体はドラッグ不可

    // ドラッグハンドルを作成（固定タブの場合は非表示にする）
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.innerHTML = "⋮⋮";

    if (!tab.pinned) {
      dragHandle.draggable = true;
      dragHandle.title = chrome.i18n.getMessage("dragToReorder");

      // ドラッグ&ドロップイベント
      dragHandle.addEventListener("dragstart", (e) => {
        draggedElement = tabItem;
        tabItem.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tab.id);
      });

      dragHandle.addEventListener("dragend", () => {
        tabItem.classList.remove("dragging");
        draggedElement = null;
        // すべてのドラッグオーバー表示をクリア
        document.querySelectorAll(".tab-item").forEach((item) => {
          item.classList.remove("drag-over-top", "drag-over-bottom");
        });
      });
    } else {
      // 固定タブの場合は完全に非表示にする
      dragHandle.style.visibility = "hidden";
      dragHandle.style.pointerEvents = "none";
      dragHandle.draggable = false;
    }

    tabItem.appendChild(dragHandle); // ファビコンの作成
    if (tab.favIconUrl) {
      const favicon = document.createElement("img");
      favicon.className = "tab-favicon";
      favicon.src = tab.favIconUrl;
      favicon.onerror = function () {
        // ファビコンの読み込みに失敗した場合、プレースホルダーに置き換え
        const placeholder = document.createElement("div");
        placeholder.className = "tab-favicon-placeholder";
        this.parentNode.replaceChild(placeholder, this);
      };
      tabItem.appendChild(favicon);
    } else {
      // ファビコンがない場合はプレースホルダー
      const placeholder = document.createElement("div");
      placeholder.className = "tab-favicon-placeholder";
      tabItem.appendChild(placeholder);
    }

    // タイトルの作成
    const title = document.createElement("div");
    title.className = "tab-title";
    const noTitle = chrome.i18n.getMessage("noTitle");
    title.textContent = tab.title || noTitle;
    tabItem.appendChild(title);

    // 新規タブ作成ボタンの作成
    const addNewTabButton = document.createElement("button");
    addNewTabButton.className = "tab-add-new-button";
    addNewTabButton.textContent = "+";
    addNewTabButton.title = chrome.i18n.getMessage("addNewTabAfter");
    addNewTabButton.addEventListener("click", async (e) => {
      e.stopPropagation(); // タブのクリックイベントを防ぐ
      await createNewTabAfter(tab.id, tab.index);
    });
    tabItem.appendChild(addNewTabButton);

    // Index Tab追加ボタンの作成
    const addIndexTabButton = document.createElement("button");
    addIndexTabButton.className = "tab-add-index-button";
    // 横棒の下に下矢印がついたアイコン（拡張機能アイコンを90度回転）
    addIndexTabButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 7 6 L 7 11 M 7 11 L 4.5 8.5 M 7 11 L 9.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
    addIndexTabButton.title = chrome.i18n.getMessage("addIndexTabHere");
    addIndexTabButton.addEventListener("click", async (e) => {
      e.stopPropagation(); // タブのクリックイベントを防ぐ
      await addIndexTabAtPosition(tab.index);
    });
    tabItem.appendChild(addIndexTabButton);

    // 閉じるボタンの作成
    const closeButton = document.createElement("button");
    closeButton.className = "tab-close-button";
    closeButton.textContent = "×";
    closeButton.title = chrome.i18n.getMessage("closeTab");
    closeButton.addEventListener("click", async (e) => {
      e.stopPropagation(); // タブのクリックイベントを防ぐ
      await closeTab(tab.id);
    });
    tabItem.appendChild(closeButton);

    // クリックイベント
    tabItem.addEventListener("click", async (e) => {
      // ドラッグハンドルのクリックは無視
      if (e.target.classList.contains("drag-handle")) return;
      await activateTab(tab.id);
    });

    // 固定タブでない場合のみドロップを受け入れる
    if (!tab.pinned) {
      tabItem.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement !== tabItem) {
          // ドラッグされているタブが固定タブかどうかをチェック
          const draggedPinned = draggedElement.dataset.pinned === "true";
          // 固定タブは固定タブでない場所にドロップできない
          if (draggedPinned) {
            e.dataTransfer.dropEffect = "none";
            return;
          }

          const bounding = tabItem.getBoundingClientRect();
          const offset = e.clientY - bounding.top;
          if (offset > bounding.height / 2) {
            tabItem.classList.add("drag-over-bottom");
            tabItem.classList.remove("drag-over-top");
          } else {
            tabItem.classList.add("drag-over-top");
            tabItem.classList.remove("drag-over-bottom");
          }
        }
      });

      tabItem.addEventListener("dragleave", () => {
        tabItem.classList.remove("drag-over-top", "drag-over-bottom");
      });

      tabItem.addEventListener("drop", async (e) => {
        e.preventDefault();
        tabItem.classList.remove("drag-over-top", "drag-over-bottom");

        if (draggedElement && draggedElement !== tabItem) {
          const draggedTabId = parseInt(draggedElement.dataset.tabId);
          const targetTabId = parseInt(tabItem.dataset.tabId);

          // 現在のタブ情報を取得
          const allTabs = await queryAllTabsForContext();
          const draggedTab = allTabs.find((t) => t.id === draggedTabId);
          const targetTab = allTabs.find((t) => t.id === targetTabId);

          if (draggedTab && targetTab) {
            // 固定タブは移動させない
            if (draggedTab.pinned) return;

            // ドロップ位置を決定
            const bounding = tabItem.getBoundingClientRect();
            const offset = e.clientY - bounding.top;
            let newIndex = targetTab.index;

            if (offset > bounding.height / 2) {
              // 下半分にドロップ - ターゲットの後ろに挿入
              newIndex =
                draggedTab.index < targetTab.index
                  ? targetTab.index
                  : targetTab.index + 1;
            } else {
              // 上半分にドロップ - ターゲットの前に挿入
              newIndex =
                draggedTab.index < targetTab.index
                  ? targetTab.index - 1
                  : targetTab.index;
            }

            await moveTab(draggedTabId, newIndex);
          }
        }
      });
    }

    tabListElement.appendChild(tabItem);
  });
}

// タブリストを更新する関数
async function updateTabList() {
  const tabs = await getRightTabs();
  displayTabs(tabs);
}

let scheduledTabListUpdateTimer = null;
function scheduleUpdateTabList(delayMs = 50) {
  if (scheduledTabListUpdateTimer) {
    clearTimeout(scheduledTabListUpdateTimer);
  }
  scheduledTabListUpdateTimer = setTimeout(() => {
    scheduledTabListUpdateTimer = null;
    updateTabList().catch((error) => {
      console.error("タブの更新に失敗しました:", error);
    });
  }, delayMs);
}

// タブの変更を監視
let lastIndexTabId = null; // サイドパネル用：前回のIndex Tab IDを記憶

function setupTabListeners() {
  // タブが作成されたとき
  chrome.tabs.onCreated.addListener(() => {
    scheduleUpdateTabList();
  });

  // タブが削除されたとき
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    // 削除されたタブのストレージデータをクリーンアップ
    const colorKey = `tabColor_${tabId}`;
    const titleKey = `tabTitle_${tabId}`;
    await chrome.storage.local.remove([colorKey, titleKey]);

    scheduleUpdateTabList();
  });

  // タブが更新されたとき（タイトルやファビコンの変更）
  chrome.tabs.onUpdated.addListener(() => {
    scheduleUpdateTabList();
  });

  // タブが移動されたとき
  chrome.tabs.onMoved.addListener(() => {
    scheduleUpdateTabList();
  });

  // タブがアタッチ/デタッチされたとき（ウィンドウ間の移動）
  chrome.tabs.onAttached.addListener(() => {
    scheduleUpdateTabList();
  });

  chrome.tabs.onDetached.addListener(() => {
    scheduleUpdateTabList();
  });

  // タブが置き換えられたとき
  chrome.tabs.onReplaced.addListener(() => {
    scheduleUpdateTabList();
  });

  // タブがアクティブになったとき
  chrome.tabs.onActivated.addListener(async () => {
    // サイドパネルかどうかを判定（getCurrent()がnullならサイドパネル）
    const currentTab = await chrome.tabs.getCurrent();

    if (!currentTab) {
      // サイドパネルの場合は、getCurrentIndexTab()が変わったかチェック
      const currentIndexTab = await getCurrentIndexTab();
      const currentIndexTabId = currentIndexTab ? currentIndexTab.id : null;

      // Index Tabが変わった場合は全体を更新
      if (lastIndexTabId !== currentIndexTabId) {
        lastIndexTabId = currentIndexTabId;
        // カラー、タイトル、Index Tabバーも更新
        setupColorPicker();
        // setupColorPickerDropdown()は初回のみ実行されるため、カラーUIの更新のみ行う
        loadColor().then((savedColor) => {
          updateColorUI(savedColor);
        });
        setupTitleEditor();
        scheduleUpdateIndexTabBar();
      }
      // アクティブタブのハイライト表示のため、常にタブリストは更新
      await updateTabList();
    } else {
      // Index Tabページの場合
      scheduleUpdateTabList(0);
    }
  });
}

// ページがフォーカスされたときの処理
function setupWindowListeners() {
  window.addEventListener("focus", async () => {
    // サイドパネルでは「初回クリック＝フォーカス取得」になることがあり、
    // focus直後にDOMを再描画すると mousedown〜mouseup 間に要素が差し替わって
    // click が発火しないことがある。
    // そのためサイドパネル時のみ少し遅延して更新する。
    const currentTab = await chrome.tabs.getCurrent();
    const delayMs = currentTab ? 0 : 150;
    scheduleUpdateTabList(delayMs);
    scheduleUpdateIndexTabBar(delayMs);
  });
}

// 指定された位置にIndex Tabを追加する関数
async function addIndexTabAtPosition(targetTabIndex) {
  try {
    // 現在のタブ情報を取得
    const thisTab = await getCurrentTab();
    if (!thisTab) return;

    // ターゲットタブの直前に挿入
    const insertIndex = targetTabIndex;

    // 新しいIndex Tabページを作成
    const newTab = await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs.html"),
      index: insertIndex,
      active: false, // 一旦非アクティブで作成
    });

    // 新しいタブのストレージをクリア（古いデータが残らないようにする）
    if (newTab && newTab.id) {
      const colorKey = `tabColor_${newTab.id}`;
      const titleKey = `tabTitle_${newTab.id}`;
      const defaultTitle =
        chrome.i18n.getMessage("defaultTabTitle") || "Index Tab";

      // 設定に基づいて色を決定
      const newColor = await getNextIndexTabColor();

      // 明示的にデフォルト値を設定
      await chrome.storage.local.set({
        [colorKey]: newColor,
        [titleKey]: defaultTitle,
      });

      // 新しく作成したタブをアクティブにする
      await chrome.tabs.update(newTab.id, { active: true });
    }

    // タブ作成が完全に反映されるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // キャッシュをクリアして強制的に更新
    lastIndexTabsState = null;
    await updateIndexTabBar();
  } catch (error) {
    console.error("Index Tabの追加に失敗しました:", error);
  }
}

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", async () => {
  // i18n初期化
  initI18n();

  // 色選択機能のセットアップ
  setupColorPicker();

  // カラーピッカードロップダウンのセットアップ（サイドパネル用）
  setupColorPickerDropdown();

  // タイトル編集機能のセットアップ
  setupTitleEditor();

  // メニュードロップダウンのセットアップ
  setupMenuDropdown();

  // 設定ポップアップのセットアップ
  setupSettingsPopup();

  // ナビゲーション機能のセットアップ
  setupIndexNavigation();

  // 初期表示
  await updateTabList();

  // タブの変更を監視開始
  setupTabListeners();

  // ウィンドウのフォーカスを監視開始
  setupWindowListeners();
});
