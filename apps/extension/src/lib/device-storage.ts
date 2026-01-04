const DEVICE_IDENTIFIER_KEY = "opentab_device_identifier";

export const storageGet = (key: string): Promise<Record<string, unknown>> =>
  new Promise((resolve) => chrome.storage.local.get(key, resolve));

export const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve));

export const tabsQuery = (query: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> =>
  new Promise((resolve) => chrome.tabs.query(query, resolve));

export const getDeviceIdentifier = async (): Promise<string> => {
  const stored = await storageGet(DEVICE_IDENTIFIER_KEY);

  if (stored[DEVICE_IDENTIFIER_KEY]) {
    return stored[DEVICE_IDENTIFIER_KEY] as string;
  }

  const newId = `extension-${crypto.randomUUID()}`;
  await storageSet({ [DEVICE_IDENTIFIER_KEY]: newId });
  return newId;
};
