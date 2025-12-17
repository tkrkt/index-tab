// Index Tabを作成する共通関数
async function createIndexTab() {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentTab) {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("tabs.html"),
      index: currentTab.index,
    });
  }
}

// 左のIndex Tabに移動する関数
async function goToLeftIndexTab() {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!currentTab) return;

  // 現在のウィンドウの全タブを取得
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const indexTabUrl = chrome.runtime.getURL("tabs.html");

  // 現在のタブより左にあるIndex Tabを探す
  const leftIndexTabs = allTabs.filter(tab =>
    tab.index < currentTab.index && tab.url === indexTabUrl
  );

  // 左にあるIndex Tabの中で最も右側（indexが最大）のものをアクティブにする
  if (leftIndexTabs.length > 0) {
    const targetTab = leftIndexTabs[leftIndexTabs.length - 1];
    await chrome.tabs.update(targetTab.id, { active: true });
  }
}

// 右のIndex Tabに移動する関数
async function goToRightIndexTab() {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!currentTab) return;

  // 現在のウィンドウの全タブを取得
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const indexTabUrl = chrome.runtime.getURL("tabs.html");

  // 現在のタブより右にあるIndex Tabを探す
  const rightIndexTabs = allTabs.filter(tab =>
    tab.index > currentTab.index && tab.url === indexTabUrl
  );

  // 右にあるIndex Tabの中で最も左側（indexが最小）のものをアクティブにする
  if (rightIndexTabs.length > 0) {
    const targetTab = rightIndexTabs[0];
    await chrome.tabs.update(targetTab.id, { active: true });
  }
}

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(async (tab) => {
  // tabs.htmlを現在のタブの直前に開く
  await chrome.tabs.create({
    url: chrome.runtime.getURL("tabs.html"),
    index: tab.index,
  });
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
