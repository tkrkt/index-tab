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
  }
});
