const state = {
  theme: localStorage.getItem("dahl-theme") || "system",
  generatedKeys: [],
  backupFile: null,
  preparedBackup: null
};

const elements = {
  themeButtons: document.querySelectorAll(".theme-button"),
  withoutBackupButton: document.getElementById("open-without-backup"),
  withBackupButton: document.getElementById("open-with-backup"),
  withoutBackupSection: document.getElementById("without-backup-section"),
  withBackupSection: document.getElementById("with-backup-section"),
  closeButtons: document.querySelectorAll(".close-workspace"),
  keyCount: document.getElementById("key-count"),
  generateKeys: document.getElementById("generate-keys"),
  keyGenerationResult: document.getElementById("key-generation-result"),
  keyGenerationTitle: document.getElementById("key-generation-title"),
  keyGenerationStatus: document.getElementById("key-generation-status"),
  keyProgressBar: document.getElementById("key-progress-bar"),
  keyStatusText: document.getElementById("key-status-text"),
  downloadKeys: document.getElementById("download-keys"),
  backupFile: document.getElementById("backup-file"),
  selectedBackupFile: document.getElementById("selected-backup-file"),
  selectedFileName: document.getElementById("selected-file-name"),
  removeBackupFile: document.getElementById("remove-backup-file"),
  backupKeyCount: document.getElementById("backup-key-count"),
  addModels: document.getElementById("add-models"),
  addCombo: document.getElementById("add-combo"),
  prepareBackup: document.getElementById("prepare-backup"),
  backupResult: document.getElementById("backup-result"),
  backupResultStatus: document.getElementById("backup-result-status"),
  backupProgressBar: document.getElementById("backup-progress-bar"),
  backupStatusText: document.getElementById("backup-status-text"),
  downloadBackup: document.getElementById("download-backup"),
  copyButtons: document.querySelectorAll(".copy-button")
};

const models = [
  "deepseek-ai/DeepSeek-V4-Flash-0731",
  "moonshotai/Kimi-K2.6",
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.2-FP8"
];

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("dahl-theme", theme);

  elements.themeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });
}

function openSection(section) {
  elements.withoutBackupSection.classList.add("hidden");
  elements.withBackupSection.classList.add("hidden");
  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSection(section) {
  section.classList.add("hidden");
}

async function createApiKey() {
  const token = await fetch("https://inference.dahl.global/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }).then(r => r.json()).then(d => d.token ?? d.api_key ?? d.key ?? "");

  return token;
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function generateKeys() {
  const count = Math.max(1, Math.min(1000, Number(elements.keyCount.value) || 10));

  elements.keyCount.value = count;
  elements.keyGenerationResult.classList.remove("hidden");
  elements.downloadKeys.classList.add("hidden");
  elements.keyProgressBar.style.width = "0%";
  elements.keyGenerationTitle.textContent = "Generating API Keys";
  elements.keyGenerationStatus.textContent = "Working";
  elements.keyStatusText.textContent = "Preparing key generation...";

  state.generatedKeys = [];

  for (let index = 0; index < count; index += 1) {
    state.generatedKeys.push(await createApiKey());

    const progress = Math.round(((index + 1) / count) * 100);

    elements.keyProgressBar.style.width = `${progress}%`;
    elements.keyStatusText.textContent = `Generating key ${index + 1} of ${count}...`;

    if (index % 10 === 0) {
      await sleep(0);
    }
  }

  elements.keyGenerationTitle.textContent = "Generation Complete";
  elements.keyGenerationStatus.textContent = "Complete";
  elements.keyStatusText.textContent = `${state.generatedKeys.length} API keys generated successfully.`;
  elements.downloadKeys.classList.remove("hidden");
}

function downloadText(filename, content) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadGeneratedKeys() {
  if (!state.generatedKeys.length) {
    return;
  }

  downloadText(
    "dahl-global-api-keys.txt",
    state.generatedKeys.join("\n")
  );
}

function setBackupFile(file) {
  state.backupFile = file || null;

  if (!file) {
    elements.selectedBackupFile.classList.add("hidden");
    elements.selectedFileName.textContent = "";
    elements.backupFile.value = "";
    return;
  }

  elements.selectedBackupFile.classList.remove("hidden");
  elements.selectedFileName.textContent = file.name;
}

function getObjectArray(object, key) {
  if (!Array.isArray(object[key])) {
    object[key] = [];
  }

  return object[key];
}

function getNow() {
  return new Date().toISOString();
}

function createProviderNode(existingNode) {
  const now = getNow();

  return {
    ...(existingNode || {}),
    prefix: "dahl",
    apiType: "chat",
    baseUrl: "https://inference.dahl.global/v1",
    id: existingNode?.id || `openai-compatible-chat-${crypto.randomUUID()}`,
    type: "openai-compatible",
    name: "Dahl Global",
    createdAt: existingNode?.createdAt || now,
    updatedAt: now
  };
}

function createProviderConnection(providerId, apiKey, index) {
  const now = getNow();

  return {
    defaultModel: ".",
    apiKey,
    testStatus: "active",
    providerSpecificData: {
      prefix: "dahl",
      apiType: "chat",
      baseUrl: "https://inference.dahl.global/v1",
      nodeName: "Dahl Global",
      connectionProxyEnabled: false,
      connectionProxyUrl: "",
      connectionNoProxy: ""
    },
    lastError: null,
    lastErrorAt: null,
    id: crypto.randomUUID(),
    provider: providerId,
    authType: "apikey",
    name: `dahl${index}`,
    email: null,
    priority: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
}

function addModelsToBackup(backup, providerId) {
  const modelCollections = [
    "models",
    "providerModels"
  ];

  const targetKey = modelCollections.find(key => Array.isArray(backup[key]));

  if (!targetKey) {
    backup.models = [];
  }

  const collection = backup[targetKey || "models"];

  models.forEach(modelId => {
    const exists = collection.some(model => {
      if (typeof model === "string") {
        return model === modelId;
      }

      return model?.model === modelId ||
        model?.modelId === modelId ||
        model?.id === modelId;
    });

    if (exists) {
      return;
    }

    collection.push({
      id: modelId,
      model: modelId,
      provider: providerId,
      name: modelId
    });
  });
}

function addComboToBackup(backup, providerId) {
  const comboCollections = [
    "combos",
    "comboPresets",
    "presets"
  ];

  const targetKey = comboCollections.find(key => Array.isArray(backup[key]));

  if (!targetKey) {
    backup.combos = [];
  }

  const collection = backup[targetKey || "combos"];

  const existing = collection.some(combo => {
    return combo?.name === "Free 9Router";
  });

  if (existing) {
    return;
  }

  collection.push({
    id: crypto.randomUUID(),
    name: "Free 9Router",
    provider: providerId,
    models: [...models]
  });
}

function findDahlProvider(backup) {
  const nodes = getObjectArray(backup, "providerNodes");

  return nodes.find(node => {
    return node?.name === "Dahl Global" ||
      node?.baseUrl === "https://inference.dahl.global/v1";
  });
}

async function prepareBackup() {
  if (!state.backupFile) {
    elements.backupResult.classList.remove("hidden");
    elements.backupResultStatus.textContent = "Missing file";
    elements.backupStatusText.textContent = "Please select a 9Router JSON backup first.";
    return;
  }

  const count = Math.max(
    1,
    Math.min(1000, Number(elements.backupKeyCount.value) || 10)
  );

  elements.backupKeyCount.value = count;
  elements.backupResult.classList.remove("hidden");
  elements.downloadBackup.classList.add("hidden");
  elements.backupProgressBar.style.width = "5%";
  elements.backupResultStatus.textContent = "Reading";
  elements.backupStatusText.textContent = "Reading the selected backup...";

  try {
    const text = await state.backupFile.text();
    const backup = JSON.parse(text);

    elements.backupProgressBar.style.width = "20%";
    elements.backupStatusText.textContent = "Analyzing 9Router configuration...";
    await sleep(80);

    const providerNodes = getObjectArray(backup, "providerNodes");
    const providerConnections = getObjectArray(backup, "providerConnections");

    const existingDahlProvider = findDahlProvider(backup);
    const providerNode = createProviderNode(existingDahlProvider);

    const existingIndex = providerNodes.findIndex(node => node?.id === providerNode.id);

    if (existingIndex >= 0) {
      providerNodes[existingIndex] = providerNode;
    } else {
      providerNodes.push(providerNode);
    }

    elements.backupProgressBar.style.width = "40%";
    elements.backupResultStatus.textContent = "Generating";
    elements.backupStatusText.textContent = `Generating ${count} Dahl Global connections...`;

    const generatedKeys = [];

    for (let index = 1; index <= count; index += 1) {
      generatedKeys.push(await createApiKey());

      elements.backupProgressBar.style.width =
        `${40 + Math.round((index / count) * 35)}%`;

      elements.backupStatusText.textContent =
        `Generating connection ${index} of ${count}...`;

      if (index % 10 === 0) {
        await sleep(0);
      }
    }

    const dahlConnections = providerConnections.filter(connection => {
      return connection?.provider === providerNode.id ||
        connection?.providerSpecificData?.baseUrl === "https://inference.dahl.global/v1";
    });

    const dahlConnectionIds = new Set(
      dahlConnections.map(connection => connection.id)
    );

    for (let index = providerConnections.length - 1; index >= 0; index -= 1) {
      if (dahlConnectionIds.has(providerConnections[index]?.id)) {
        providerConnections.splice(index, 1);
      }
    }

    generatedKeys.forEach((apiKey, index) => {
      providerConnections.push(
        createProviderConnection(providerNode.id, apiKey, index + 1)
      );
    });

    elements.backupProgressBar.style.width = "82%";
    elements.backupResultStatus.textContent = "Configuring";
    elements.backupStatusText.textContent = "Applying Dahl Global configuration...";
    await sleep(100);

    if (elements.addModels.checked) {
      addModelsToBackup(backup, providerNode.id);
    }

    elements.backupProgressBar.style.width = "91%";

    if (elements.addCombo.checked) {
      addComboToBackup(backup, providerNode.id);
    }

    backup.updatedAt = getNow();

    state.preparedBackup = backup;

    elements.backupProgressBar.style.width = "100%";
    elements.backupResultStatus.textContent = "Complete";
    elements.backupStatusText.textContent =
      `Backup prepared successfully with ${count} Dahl Global connections.`;
    elements.downloadBackup.classList.remove("hidden");
  } catch (error) {
    state.preparedBackup = null;
    elements.backupProgressBar.style.width = "0%";
    elements.backupResultStatus.textContent = "Error";
    elements.backupStatusText.textContent =
      error instanceof SyntaxError
        ? "The selected file is not valid JSON."
        : "The backup could not be prepared.";
  }
}

function downloadPreparedBackup() {
  if (!state.preparedBackup) {
    return;
  }

  const json = JSON.stringify(state.preparedBackup, null, 2);

  const blob = new Blob([json], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "9router-dahl-global-backup.json";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyValue(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const originalText = button.textContent;

    button.textContent = "Copied";

    setTimeout(() => {
      button.textContent = originalText;
    }, 1200);
  } catch {
    const textarea = document.createElement("textarea");

    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();

    const originalText = button.textContent;
    button.textContent = "Copied";

    setTimeout(() => {
      button.textContent = originalText;
    }, 1200);
  }
}

elements.themeButtons.forEach(button => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.theme);
  });
});

elements.withoutBackupButton.addEventListener("click", () => {
  openSection(elements.withoutBackupSection);
});

elements.withBackupButton.addEventListener("click", () => {
  openSection(elements.withBackupSection);
});

elements.closeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const section = document.getElementById(button.dataset.close);

    if (section) {
      closeSection(section);
    }
  });
});

elements.generateKeys.addEventListener("click", generateKeys);

elements.downloadKeys.addEventListener("click", downloadGeneratedKeys);

elements.backupFile.addEventListener("change", event => {
  const [file] = event.target.files;

  setBackupFile(file);
});

elements.removeBackupFile.addEventListener("click", () => {
  setBackupFile(null);
});

elements.prepareBackup.addEventListener("click", prepareBackup);

elements.downloadBackup.addEventListener("click", downloadPreparedBackup);

elements.copyButtons.forEach(button => {
  button.addEventListener("click", () => {
    copyValue(button.dataset.copy, button);
  });
});

elements.keyCount.addEventListener("input", () => {
  const value = Number(elements.keyCount.value);

  if (value > 1000) {
    elements.keyCount.value = 1000;
  }

  if (value < 1 && elements.keyCount.value !== "") {
    elements.keyCount.value = 1;
  }
});

elements.backupKeyCount.addEventListener("input", () => {
  const value = Number(elements.backupKeyCount.value);

  if (value > 1000) {
    elements.backupKeyCount.value = 1000;
  }

  if (value < 1 && elements.backupKeyCount.value !== "") {
    elements.backupKeyCount.value = 1;
  }
});

applyTheme(state.theme);
