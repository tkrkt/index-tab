// i18n対応: HTMLの要素を翻訳する関数
function initI18n() {
  // data-i18n属性を持つ要素のテキストコンテンツを翻訳
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });

  // data-i18n-title属性を持つ要素のtitle属性を翻訳
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.title = message;
    }
  });

  // data-i18n-placeholder属性を持つ要素のplaceholder属性を翻訳
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.placeholder = message;
    }
  });

  // ページタイトルを翻訳
  const pageTitle = chrome.i18n.getMessage('pageTitle');
  if (pageTitle) {
    document.title = pageTitle;
  }

  // HTMLのlang属性を設定
  const uiLanguage = chrome.i18n.getUILanguage();
  document.documentElement.lang = uiLanguage.startsWith('ja') ? 'ja' : 'en';
}

// デフォルトの色
const DEFAULT_COLOR = "#4285f4";

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
  const thisTab = await chrome.tabs.getCurrent();

  if (thisTab && thisTab.id) {
    // タブIDをキーにして色を保存
    const key = `tabColor_${thisTab.id}`;
    await chrome.storage.local.set({ [key]: color });
  }
}

// 色を読み込む関数
async function loadColor() {
  // chrome.tabs.getCurrent()で現在のタブを取得(アクティブでなくても取得できる)
  const thisTab = await chrome.tabs.getCurrent();

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

// 色選択ボタンのセットアップ
function setupColorPicker() {
  const colorButtons = document.querySelectorAll(".color-button");

  // 初期色を読み込んでファビコンを設定
  loadColor().then((savedColor) => {
    setFavicon(savedColor);
    setBackgroundColor(savedColor);
    // アクティブなボタンをマーク
    colorButtons.forEach((btn) => {
      if (btn.dataset.color === savedColor) {
        btn.classList.add("active");
      }
    });
  });

  // 各ボタンにクリックイベントを設定
  colorButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const color = button.dataset.color;

      // ファビコンを変更
      setFavicon(color);

      // 背景色を変更
      setBackgroundColor(color);

      // 色を保存
      await saveColor(color);

      // アクティブ状態を更新
      colorButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

// タイトルを保存する関数
async function saveTitle(title) {
  const thisTab = await chrome.tabs.getCurrent();

  if (thisTab && thisTab.id) {
    const key = `tabTitle_${thisTab.id}`;
    await chrome.storage.local.set({ [key]: title });
  }
}

// タイトルを読み込む関数
async function loadTitle() {
  // chrome.tabs.getCurrent()で現在のタブを取得(アクティブでなくても取得できる)
  const thisTab = await chrome.tabs.getCurrent();

  if (thisTab && thisTab.id) {
    const key = `tabTitle_${thisTab.id}`;
    const result = await chrome.storage.local.get(key);
    const title = result[key];

    // ストレージに値がない場合はデフォルト値を保存
    if (!title) {
      const defaultTitle = chrome.i18n.getMessage('defaultTabTitle') || 'Index Tab';
      await chrome.storage.local.set({ [key]: defaultTitle });
      return defaultTitle;
    }

    return title;
  }
  return chrome.i18n.getMessage('defaultTabTitle') || 'Index Tab';
}

// ページタイトルの編集機能をセットアップ
async function setupTitleEditor() {
  const titleInput = document.getElementById("pageTitle");

  if (!titleInput) return;

  // 保存されたタイトルを読み込む
  const savedTitle = await loadTitle();
  titleInput.value = savedTitle;
  document.title = savedTitle;

  let saveTitleTimeout = null;

  // タイトル変更時にページタイトルを更新
  titleInput.addEventListener("input", () => {
    const defaultTitle = chrome.i18n.getMessage('defaultTabTitle') || 'Index Tab';
    const newTitle = titleInput.value.trim() || defaultTitle;
    document.title = newTitle;

    // デバウンス処理：入力が止まってから300ms後に保存
    if (saveTitleTimeout) {
      clearTimeout(saveTitleTimeout);
    }
    saveTitleTimeout = setTimeout(async () => {
      await saveTitle(newTitle);
    }, 300);
  });

  // Enterキーで入力を確定
  titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      titleInput.blur();
    }
  });
}

// 閉じるドロップダウンの機能をセットアップ
function setupCloseDropdown() {
  const dropdownButton = document.getElementById("closeDropdownButton");
  const dropdownMenu = document.getElementById("closeDropdownMenu");
  const dropdownItems = document.querySelectorAll(".close-dropdown-item");

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

      if (action === "close-tab") {
        // このIndex Tabのみを閉じる
        await closeCurrentIndexTab();
      } else if (action === "close-all") {
        // 確認ダイアログを表示
        const confirmMessage = chrome.i18n.getMessage('confirmCloseAll');
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

// 現在のIndex Tabのみを閉じる
async function closeCurrentIndexTab() {
  try {
    const thisTab = await chrome.tabs.getCurrent();
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
    const thisTab = await chrome.tabs.getCurrent();
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
    const allTabs = await chrome.tabs.query({ currentWindow: true });

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
      await chrome.tabs.update(leftIndexTab.id, { active: true });
    }
  } catch (error) {
    console.error("Index Tabのアクティブ化に失敗しました:", error);
  }
}

// Index Tabタブバーの表示を更新
let updatingIndexTabBar = false;
let lastIndexTabsState = null; // 前回のタブ状態をキャッシュ

async function updateIndexTabBar() {
  // 既に更新中の場合はスキップ
  if (updatingIndexTabBar) {
    return;
  }

  const tabBar = document.getElementById("indexTabBar");
  if (!tabBar) return;

  updatingIndexTabBar = true;

  try {
    // このタブ自身の情報を取得
    const [thisTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
      url: chrome.runtime.getURL("tabs.html"),
    });

    // このIndex Tabページがアクティブでない場合は更新しない
    if (!thisTab) {
      return;
    }

    const allTabs = await chrome.tabs.query({ currentWindow: true });

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
      const defaultTitle = chrome.i18n.getMessage('defaultTabTitle') || 'Index Tab';
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
        isActive: indexTab.id === thisTab.id,
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

      // バッジを作成（タブ数が0より大きい場合のみ）
      const badge = document.createElement("span");
      badge.className = "index-tab-badge";
      badge.textContent = tabData.tabCount;
      badge.style.backgroundColor = tabData.color;

      tabElement.appendChild(favicon);
      tabElement.appendChild(titleElement);
      if (tabData.tabCount > 0) {
        tabElement.appendChild(badge);
      }

      // クリックでそのIndex Tabに切り替え
      const targetTabId = tabData.id;
      const targetTabIndex = tabData.index;
      tabElement.addEventListener("click", async (e) => {
        // ドラッグ中は無視
        if (tabElement.classList.contains("drag-over")) return;
        await chrome.tabs.update(targetTabId, { active: true });
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
        tabElement.classList.remove("drag-over-left", "drag-over-right", "drag-over-tab");
      });

      // ドロップイベント
      tabElement.addEventListener("drop", async (e) => {
        e.preventDefault();
        tabElement.classList.remove("drag-over-left", "drag-over-right", "drag-over-tab");

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

// Index Tabページ間のナビゲーション機能をセットアップ
let indexNavigationInitialized = false;

function setupIndexNavigation() {
  // 初期表示
  updateIndexTabBar();

  // リスナーは一度だけ登録
  if (!indexNavigationInitialized) {
    indexNavigationInitialized = true;

    // タブの変更時に更新
    chrome.tabs.onActivated.addListener(updateIndexTabBar);
    chrome.tabs.onCreated.addListener(updateIndexTabBar);
    chrome.tabs.onRemoved.addListener(updateIndexTabBar);
    chrome.tabs.onMoved.addListener(updateIndexTabBar);
    chrome.tabs.onUpdated.addListener(updateIndexTabBar);
    chrome.tabs.onAttached.addListener(updateIndexTabBar);
    chrome.tabs.onDetached.addListener(updateIndexTabBar);

    // ストレージの変更時にも更新（色やタイトルが変更された時）
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        updateIndexTabBar();
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
    const allTabs = await chrome.tabs.query({ currentWindow: true });

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
    // このタブ自身の情報を取得
    const [thisTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
      url: chrome.runtime.getURL("tabs.html"),
    });

    // 同じウィンドウのすべてのタブを取得
    const allTabs = await chrome.tabs.query({ currentWindow: true });

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
    const allTabs = await chrome.tabs.query({ currentWindow: true });
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

// タブリストを表示する関数
let draggedElement = null; // ドラッグ中の要素を保持

function displayTabs(tabs) {
  const tabListElement = document.getElementById("tabList");

  if (tabs.length === 0) {
    const emptyMessage = chrome.i18n.getMessage('emptyMessage');
    tabListElement.innerHTML =
      `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  tabListElement.innerHTML = "";

  tabs.forEach((tab, index) => {
    const tabItem = document.createElement("div");
    tabItem.className = "tab-item";
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
      dragHandle.title = chrome.i18n.getMessage('dragToReorder');

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

    tabItem.appendChild(dragHandle);    // ファビコンの作成
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
    const noTitle = chrome.i18n.getMessage('noTitle');
    title.textContent = tab.title || noTitle;
    tabItem.appendChild(title);

    // 新規タブ作成ボタンの作成
    const addNewTabButton = document.createElement("button");
    addNewTabButton.className = "tab-add-new-button";
    addNewTabButton.textContent = "+";
    addNewTabButton.title = chrome.i18n.getMessage('addNewTabAfter');
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
    addIndexTabButton.title = chrome.i18n.getMessage('addIndexTabHere');
    addIndexTabButton.addEventListener("click", async (e) => {
      e.stopPropagation(); // タブのクリックイベントを防ぐ
      await addIndexTabAtPosition(tab.index);
    });
    tabItem.appendChild(addIndexTabButton);

    // 閉じるボタンの作成
    const closeButton = document.createElement("button");
    closeButton.className = "tab-close-button";
    closeButton.textContent = "×";
    closeButton.title = chrome.i18n.getMessage('closeTab');
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
          const allTabs = await chrome.tabs.query({ currentWindow: true });
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

// タブの変更を監視
function setupTabListeners() {
  // タブが作成されたとき
  chrome.tabs.onCreated.addListener(() => {
    updateTabList();
  });

  // タブが削除されたとき
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    // 削除されたタブのストレージデータをクリーンアップ
    const colorKey = `tabColor_${tabId}`;
    const titleKey = `tabTitle_${tabId}`;
    await chrome.storage.local.remove([colorKey, titleKey]);

    updateTabList();
  });

  // タブが更新されたとき（タイトルやファビコンの変更）
  chrome.tabs.onUpdated.addListener(() => {
    updateTabList();
  });

  // タブが移動されたとき
  chrome.tabs.onMoved.addListener(() => {
    updateTabList();
  });

  // タブがアタッチ/デタッチされたとき（ウィンドウ間の移動）
  chrome.tabs.onAttached.addListener(() => {
    updateTabList();
  });

  chrome.tabs.onDetached.addListener(() => {
    updateTabList();
  });

  // タブが置き換えられたとき
  chrome.tabs.onReplaced.addListener(() => {
    updateTabList();
  });

  // タブがアクティブになったとき
  chrome.tabs.onActivated.addListener(() => {
    updateTabList();
  });
}

// ページがフォーカスされたときの処理
function setupWindowListeners() {
  window.addEventListener("focus", () => {
    updateTabList();
    updateIndexTabBar();
  });
}

// 指定された位置にIndex Tabを追加する関数
async function addIndexTabAtPosition(targetTabIndex) {
  try {
    // 現在のタブ情報を取得
    const [thisTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
      url: chrome.runtime.getURL("tabs.html"),
    });

    if (!thisTab) return;

    // ターゲットタブの直前に挿入
    const insertIndex = targetTabIndex;

    // 新しいIndex Tabページを作成
    const newTab = await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs.html"),
      index: insertIndex,
      active: false, // アクティブにしない
    });

    // 新しいタブのストレージをクリア（古いデータが残らないようにする）
    if (newTab && newTab.id) {
      const colorKey = `tabColor_${newTab.id}`;
      const titleKey = `tabTitle_${newTab.id}`;
      const defaultTitle = chrome.i18n.getMessage('defaultTabTitle') || 'Index Tab';
      // 明示的にデフォルト値を設定
      await chrome.storage.local.set({
        [colorKey]: DEFAULT_COLOR,
        [titleKey]: defaultTitle
      });
    }

    // タブ作成が完全に反映されるまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));

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

  // タイトル編集機能のセットアップ
  setupTitleEditor();

  // 閉じるドロップダウンのセットアップ
  setupCloseDropdown();

  // ナビゲーション機能のセットアップ
  setupIndexNavigation();

  // 初期表示
  await updateTabList();

  // タブの変更を監視開始
  setupTabListeners();

  // ウィンドウのフォーカスを監視開始
  setupWindowListeners();
});
