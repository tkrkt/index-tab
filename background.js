// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(async (tab) => {
  // tabs.htmlを現在のタブの直前に開く
  await chrome.tabs.create({
    url: chrome.runtime.getURL("tabs.html"),
    index: tab.index,
  });
});
