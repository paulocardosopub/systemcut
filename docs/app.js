const state = {
  projects: [],
  exports: [],
  activeProjectId: null,
  selectedCutId: null,
  currentFile: null,
  currentObjectUrl: null,
  selectedUploadFile: null
};

const els = {};
const DB_NAME = "system-smart-cut-local";
const DB_VERSION = 1;
const PROJECTS_KEY = "ssc.projects.v1";
const EXPORTS_KEY = "ssc.exports.v1";

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  bindEvents();
  state.projects = loadJson(PROJECTS_KEY, []);
  state.exports = loadJson(EXPORTS_KEY, []);
  renderAll();
  await openLastProject();
});

function bindElements() {
  [
    "projectList",
    "viewTitle",
    "uploadView",
    "editorView",
    "historyView",
    "exportsView",
    "dropZone",
    "videoInput",
    "selectVideoButton",
    "selectedFile",
    "videoUrlInput",
    "importUrlButton",
    "registerSocialLinkButton",
    "copyVideoUrlButton",
    "urlImportStatus",
    "projectTitleInput",
    "contentTypeInput",
    "objectiveInput",
    "durationInput",
    "createProjectButton",
    "uploadStatus",
    "emptyEditor",
    "editorGrid",
    "projectStatus",
    "projectName",
    "projectMeta",
    "videoPlayer",
    "timelineTrack",
    "selectedCutsCount",
    "transcriptCount",
    "transcriptList",
    "cutsList",
    "cutTotal",
    "createManualCutButton",
    "exportFormatInput",
    "exportVideoButton",
    "exportProgress",
    "exportProgressBar",
    "downloadExportLink",
    "downloadSrtButton",
    "downloadVttButton",
    "exportStatus",
    "exportQualityInput",
    "downloadWavButton",
    "downloadMp3Button",
    "historySearchInput",
    "historyStatusInput",
    "historyList",
    "exportsList",
    "clearLocalDataButton"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewButton));
  });

  els.selectVideoButton.addEventListener("click", () => els.videoInput.click());
  els.videoInput.addEventListener("change", () => selectUploadFile(els.videoInput.files[0]));
  els.createProjectButton.addEventListener("click", createProjectFromUpload);
  els.importUrlButton.addEventListener("click", importVideoUrl);
  els.registerSocialLinkButton.addEventListener("click", registerSocialLink);
  els.copyVideoUrlButton.addEventListener("click", copyVideoUrl);
  els.createManualCutButton.addEventListener("click", createManualCut);
  els.exportVideoButton.addEventListener("click", exportSelectedCuts);
  els.downloadWavButton.addEventListener("click", () => downloadAudio("wav"));
  els.downloadMp3Button.addEventListener("click", () => downloadAudio("mp3"));
  els.downloadSrtButton.addEventListener("click", () => downloadCaptions("srt"));
  els.downloadVttButton.addEventListener("click", () => downloadCaptions("vtt"));
  els.historySearchInput.addEventListener("input", renderHistory);
  els.historyStatusInput.addEventListener("change", renderHistory);
  els.clearLocalDataButton.addEventListener("click", clearLocalData);

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    selectUploadFile(event.dataTransfer.files[0]);
  });

  els.videoPlayer.addEventListener("timeupdate", () => {
    const cut = getSelectedCut();
    if (cut && els.videoPlayer.currentTime > cut.endTime) {
      els.videoPlayer.pause();
    }
  });
}

function showView(view) {
  const views = {
    upload: ["Enviar video", els.uploadView],
    editor: ["Editor", els.editorView],
    history: ["Historico", els.historyView],
    exports: ["Exportacoes", els.exportsView]
  };

  Object.values(views).forEach(([, element]) => element.classList.remove("active"));
  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewButton === view);
  });

  const [title, element] = views[view] || views.upload;
  els.viewTitle.textContent = title;
  element.classList.add("active");
}

function selectUploadFile(file) {
  if (!file) return;

  const valid = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
  const validExt = [".mp4", ".mov", ".mkv", ".webm"].some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!valid.includes(file.type) && !validExt) {
    els.uploadStatus.textContent = "Formato invalido.";
    return;
  }

  state.selectedUploadFile = file;
  els.selectedFile.hidden = false;
  els.selectedFile.innerHTML = `<strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span>`;
  els.projectTitleInput.value = els.projectTitleInput.value || file.name.replace(/\.[^.]+$/, "");
  els.uploadStatus.textContent = "";
}

async function createProjectFromUpload() {
  const file = state.selectedUploadFile;
  if (!file) {
    els.uploadStatus.textContent = "Selecione um video.";
    return;
  }

  els.uploadStatus.textContent = "Analisando video localmente...";
  els.createProjectButton.disabled = true;

  try {
    await createProjectFromFile(file, { sourceType: "upload" });
    els.uploadStatus.textContent = "Projeto criado.";
  } catch (error) {
    els.uploadStatus.textContent = error instanceof Error ? error.message : "Falha ao criar projeto.";
  } finally {
    els.createProjectButton.disabled = false;
  }
}

async function createProjectFromFile(file, options = {}) {
  const metadata = await readVideoMetadata(file);
  const id = `project-${Date.now()}`;
  const targetDuration = desiredDurationToSeconds(els.durationInput.value);
  const transcript = generateTranscript(metadata.duration, els.contentTypeInput.value, els.objectiveInput.value);
  const cuts = generateSmartCuts(metadata.duration, targetDuration, els.contentTypeInput.value, els.objectiveInput.value, transcript);
  const thumbnail = await generateThumbnail(file, metadata.duration);

  const project = {
    id,
    title: els.projectTitleInput.value.trim() || file.name,
    originalFileName: file.name,
    fileType: file.type || "video/mp4",
    fileSize: file.size,
    sourceType: options.sourceType || "upload",
    sourceUrl: options.sourceUrl || "",
    thumbnail,
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    status: "Pronto para edicao",
    contentType: els.contentTypeInput.value,
    objective: els.objectiveInput.value,
    desiredDuration: els.durationInput.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transcript,
    cuts
  };

  await saveVideoFile(id, file);
  state.projects.unshift(project);
  state.activeProjectId = id;
  state.selectedCutId = cuts[0]?.id || null;
  saveProjects();
  await loadProjectVideo(project);
  renderAll();
  showView("editor");
  return project;
}

async function importVideoUrl() {
  const rawUrl = els.videoUrlInput.value.trim();
  els.urlImportStatus.textContent = "";

  if (!rawUrl) {
    els.urlImportStatus.textContent = "Cole um link para importar.";
    return;
  }

  if (!isValidUrl(rawUrl)) {
    els.urlImportStatus.textContent = "Link invalido.";
    return;
  }

  if (isSocialPlatformUrl(rawUrl)) {
    els.urlImportStatus.textContent =
      "Links de YouTube, TikTok e Instagram precisam do app com servidor. Nesta pagina, copie o link, use uma ferramenta externa e envie o MP4/WEBM baixado.";
    return;
  }

  els.importUrlButton.disabled = true;
  els.urlImportStatus.textContent = "Baixando video pelo navegador...";

  try {
    const response = await fetch(rawUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`Nao foi possivel baixar o video (${response.status}).`);

    const blob = await response.blob();
    if (!blob.type.startsWith("video/") && !hasVideoExtension(rawUrl)) {
      throw new Error("O link nao parece ser um arquivo de video direto.");
    }

    const fileName = fileNameFromUrl(rawUrl);
    const file = new File([blob], fileName, { type: blob.type || mimeFromFileName(fileName) });
    els.projectTitleInput.value = els.projectTitleInput.value || fileName.replace(/\.[^.]+$/, "");
    await createProjectFromFile(file, { sourceType: "direct-url", sourceUrl: rawUrl });
    els.urlImportStatus.textContent = "Link importado.";
  } catch (error) {
    els.urlImportStatus.textContent =
      error instanceof Error
        ? `${error.message} Se for YouTube/TikTok/Instagram, sera necessario backend para importar.`
        : "Falha ao importar link.";
  } finally {
    els.importUrlButton.disabled = false;
  }
}

function registerSocialLink() {
  const rawUrl = els.videoUrlInput.value.trim();
  if (!rawUrl || !isValidUrl(rawUrl)) {
    els.urlImportStatus.textContent = "Cole um link valido do YouTube, TikTok ou Instagram.";
    return;
  }

  if (!isSocialPlatformUrl(rawUrl)) {
    els.urlImportStatus.textContent = "Para links diretos de video, use Importar link.";
    return;
  }

  const id = `project-${Date.now()}`;
  const title = els.projectTitleInput.value.trim() || socialTitleFromUrl(rawUrl);
  const project = {
    id,
    title,
    originalFileName: rawUrl,
    fileType: "social-link",
    fileSize: 0,
    sourceType: "social-url",
    sourceUrl: rawUrl,
    thumbnail: "./assets/hero-smart-cut.png",
    duration: 0,
    width: 0,
    height: 0,
    status: "Aguardando backend",
    contentType: els.contentTypeInput.value,
    objective: els.objectiveInput.value,
    desiredDuration: els.durationInput.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transcript: [],
    cuts: []
  };

  state.projects.unshift(project);
  saveProjects();
  renderAll();
  els.urlImportStatus.textContent =
    "Link social salvo. Para editar nesta pagina, baixe o MP4/WEBM em uma ferramenta externa e envie o arquivo.";
}

async function copyVideoUrl() {
  const rawUrl = els.videoUrlInput.value.trim();

  if (!rawUrl) {
    els.urlImportStatus.textContent = "Cole um link antes de copiar.";
    return;
  }

  try {
    await navigator.clipboard.writeText(rawUrl);
    els.urlImportStatus.textContent = "Link copiado. Abra a ferramenta externa, baixe o video e envie o arquivo aqui.";
  } catch {
    els.videoUrlInput.select();
    els.urlImportStatus.textContent = "Nao consegui copiar automaticamente. Use Ctrl+C no link selecionado.";
  }
}

async function openLastProject() {
  if (!state.projects.length) return;
  await openProject(state.projects[0].id, false);
}

async function openProject(id, switchView = true) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;

  state.activeProjectId = id;
  state.selectedCutId = project.cuts[0]?.id || null;
  await loadProjectVideo(project);
  renderAll();
  if (switchView) showView("editor");
}

async function loadProjectVideo(project) {
  revokeCurrentObjectUrl();
  const blob = await loadVideoFile(project.id);
  if (!blob) {
    state.currentFile = null;
    state.currentObjectUrl = null;
    return;
  }

  state.currentFile = blob;
  state.currentObjectUrl = URL.createObjectURL(blob);
  els.videoPlayer.src = state.currentObjectUrl;
  els.videoPlayer.load();
}

function renderAll() {
  renderProjectList();
  renderEditor();
  renderHistory();
  renderExports();
}

function renderProjectList() {
  if (!state.projects.length) {
    els.projectList.innerHTML = `<p class="status-line">Nenhum projeto local.</p>`;
    return;
  }

  els.projectList.innerHTML = "";
  state.projects.slice(0, 8).forEach((project) => {
    const button = document.createElement("button");
    button.className = "project-pill";
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(project.title)}</strong><span>${formatSeconds(project.duration)} - ${escapeHtml(project.status)}</span>`;
    button.addEventListener("click", () => openProject(project.id));
    els.projectList.append(button);
  });
}

function renderEditor() {
  const project = getActiveProject();
  const hasProject = Boolean(project);

  els.emptyEditor.hidden = hasProject;
  els.editorGrid.hidden = !hasProject;

  if (!project) return;

  els.projectStatus.textContent = project.status;
  els.projectName.textContent = project.title;
  const hasVideo = Boolean(state.currentFile && project.duration > 0);
  els.createManualCutButton.disabled = !hasVideo;
  els.projectMeta.textContent =
    project.sourceType === "social-url" && !hasVideo
      ? `${project.sourceUrl} - aguardando backend/proxy para baixar e editar`
      : `${project.originalFileName} - ${formatSeconds(project.duration)} - ${project.width}x${project.height}`;
  els.cutTotal.textContent = String(project.cuts.length);
  const selectedCount = project.cuts.filter((cut) => cut.isSelected).length;
  els.selectedCutsCount.textContent = `${selectedCount} cortes selecionados`;
  els.transcriptCount.textContent = `${project.transcript.length} segmentos`;

  renderTimeline(project);
  renderTranscript(project);
  renderCuts(project);
}

function renderTimeline(project) {
  els.timelineTrack.innerHTML = "";
  project.cuts.forEach((cut) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `timeline-cut ${cut.id === state.selectedCutId ? "active" : ""} ${cut.isSelected ? "" : "off"}`;
    button.style.left = `${Math.max(0, (cut.startTime / project.duration) * 100)}%`;
    button.style.width = `${Math.max(1.5, ((cut.endTime - cut.startTime) / project.duration) * 100)}%`;
    button.title = cut.title;
    button.addEventListener("click", () => playCut(cut.id));
    els.timelineTrack.append(button);
  });
}

function renderTranscript(project) {
  els.transcriptList.innerHTML = "";
  project.transcript.forEach((segment) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "transcript-item";
    button.innerHTML = `<strong>${formatSeconds(segment.startTime)} - ${formatSeconds(segment.endTime)}</strong>${escapeHtml(segment.text)}`;
    button.addEventListener("click", () => {
      els.videoPlayer.currentTime = segment.startTime;
    });
    els.transcriptList.append(button);
  });
}

function renderCuts(project) {
  els.cutsList.innerHTML = "";
  const template = document.getElementById("cutTemplate");

  project.cuts.forEach((cut) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("active", cut.id === state.selectedCutId);
    node.querySelector(".cut-title-button").textContent = `${cut.title} - ${formatSeconds(cut.startTime)}-${formatSeconds(cut.endTime)}`;
    node.querySelector(".toggle-cut-button").textContent = cut.isSelected ? "On" : "Off";
    node.querySelector(".cut-reason").textContent = cut.reason;
    node.querySelector(".cut-editor").hidden = cut.id !== state.selectedCutId;
    node.querySelector(".cut-title-input").value = cut.title;
    node.querySelector(".cut-start-input").value = cut.startTime.toFixed(1);
    node.querySelector(".cut-end-input").value = cut.endTime.toFixed(1);

    node.querySelector(".cut-title-button").addEventListener("click", () => selectCut(cut.id));
    node.querySelector(".toggle-cut-button").addEventListener("click", () => toggleCut(cut.id));
    node.querySelector(".play-cut-button").addEventListener("click", () => playCut(cut.id));
    node.querySelector(".save-cut-button").addEventListener("click", () => {
      saveCut(cut.id, {
        title: node.querySelector(".cut-title-input").value.trim() || "Corte",
        startTime: Number(node.querySelector(".cut-start-input").value),
        endTime: Number(node.querySelector(".cut-end-input").value)
      });
    });

    els.cutsList.append(node);
  });
}

function renderHistory() {
  const query = els.historySearchInput.value.trim().toLowerCase();
  const status = els.historyStatusInput.value;
  const projects = state.projects.filter((project) => {
    const matchesStatus = status === "Todos" || project.status === status;
    const haystack = `${project.title} ${project.originalFileName} ${project.contentType} ${project.objective}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });

  if (!projects.length) {
    els.historyList.innerHTML = `<div class="empty-state"><h2>Nenhum projeto encontrado</h2></div>`;
    return;
  }

  els.historyList.innerHTML = "";
  projects.forEach((project) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <img src="${project.thumbnail}" alt="" />
      <div>
        <strong>${escapeHtml(project.title)}</strong>
        <span>${escapeHtml(project.status)} - ${formatSeconds(project.duration)} - ${escapeHtml(project.contentType)}</span>
        <span>${escapeHtml(project.objective)} - ${project.cuts.length} cortes - ${formatDate(project.updatedAt)}</span>
      </div>
      <div class="history-actions">
        <button class="ghost-button open-history-button" type="button">Abrir</button>
        <button class="ghost-button duplicate-history-button" type="button">Duplicar</button>
        <button class="ghost-button danger delete-history-button" type="button">Excluir</button>
      </div>
    `;
    item.querySelector(".open-history-button").addEventListener("click", () => openProject(project.id));
    item.querySelector(".duplicate-history-button").addEventListener("click", () => duplicateProject(project.id));
    item.querySelector(".delete-history-button").addEventListener("click", () => deleteProject(project.id));
    els.historyList.append(item);
  });
}

function renderExports() {
  if (!state.exports.length) {
    els.exportsList.innerHTML = `<div class="empty-state"><h2>Nenhuma exportacao local</h2></div>`;
    return;
  }

  els.exportsList.innerHTML = "";
  state.exports.forEach((exportItem) => {
    const item = document.createElement("article");
    item.className = "export-item";
    item.innerHTML = `
      <strong>${escapeHtml(exportItem.title)}</strong>
      <span>${escapeHtml(exportItem.format)} - ${escapeHtml(exportItem.fileName)} - ${formatDate(exportItem.createdAt)}</span>
    `;
    els.exportsList.append(item);
  });
}

function selectCut(id) {
  state.selectedCutId = id;
  renderEditor();
}

function toggleCut(id) {
  const project = getActiveProject();
  const cut = project?.cuts.find((item) => item.id === id);
  if (!cut) return;
  cut.isSelected = !cut.isSelected;
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderEditor();
}

function saveCut(id, data) {
  const project = getActiveProject();
  const cut = project?.cuts.find((item) => item.id === id);
  if (!cut) return;

  if (!Number.isFinite(data.startTime) || !Number.isFinite(data.endTime) || data.endTime <= data.startTime) {
    els.exportStatus.textContent = "Ajuste tempos validos para o corte.";
    return;
  }

  cut.title = data.title;
  cut.startTime = Math.max(0, Math.min(data.startTime, project.duration - 0.5));
  cut.endTime = Math.min(project.duration, Math.max(cut.startTime + 0.5, data.endTime));
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderEditor();
}

function playCut(id) {
  const cut = getActiveProject()?.cuts.find((item) => item.id === id);
  if (!cut) return;
  state.selectedCutId = id;
  els.videoPlayer.currentTime = cut.startTime;
  els.videoPlayer.play().catch(() => undefined);
  renderEditor();
}

function createManualCut() {
  const project = getActiveProject();
  if (!project) return;

  const start = Math.max(0, els.videoPlayer.currentTime || 0);
  const end = Math.min(project.duration, start + Math.min(60, project.duration / 3));
  const cut = {
    id: `cut-${Date.now()}`,
    startTime: roundTime(start),
    endTime: roundTime(Math.max(start + 2, end)),
    duration: roundTime(Math.max(2, end - start)),
    title: "Corte manual",
    description: "Corte criado no editor local.",
    reason: "Criado manualmente pelo usuario.",
    score: 80,
    tags: ["manual"],
    transcriptExcerpt: "",
    isSelected: true,
    orderIndex: project.cuts.length,
    createdBy: "user"
  };

  project.cuts.push(cut);
  state.selectedCutId = cut.id;
  project.updatedAt = new Date().toISOString();
  saveProjects();
  renderEditor();
}

async function exportSelectedCuts() {
  const project = getActiveProject();
  if (!project || !state.currentFile) {
    els.exportStatus.textContent = "Abra um projeto com video importado para exportar.";
    return;
  }

  const cuts = project.cuts.filter((cut) => cut.isSelected).sort((a, b) => a.orderIndex - b.orderIndex);
  if (!cuts.length) {
    els.exportStatus.textContent = "Selecione pelo menos um corte.";
    return;
  }

  if (typeof els.videoPlayer.captureStream !== "function" || typeof MediaRecorder === "undefined") {
    downloadJson(project);
    els.exportStatus.textContent = "Seu navegador nao suporta exportacao em video. Baixei o plano de cortes.";
    return;
  }

  els.exportVideoButton.disabled = true;
  els.exportStatus.textContent = "Exportando video no navegador...";
  els.exportProgress.hidden = false;
  setExportProgress(4);

  const previousMuted = els.videoPlayer.muted;
  const previousVolume = els.videoPlayer.volume;
  els.videoPlayer.volume = 0;
  els.videoPlayer.muted = false;

  try {
    const settings = getVideoExportSettings(project, els.exportFormatInput.value, els.exportQualityInput.value);
    const canvas = document.createElement("canvas");
    canvas.width = settings.width;
    canvas.height = settings.height;
    const context = canvas.getContext("2d");
    const canvasStream = canvas.captureStream(settings.fps);
    const sourceStream = els.videoPlayer.captureStream();
    sourceStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    const mimeType = pickRecorderMimeType();
    const recorderOptions = {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: settings.videoBitsPerSecond,
      audioBitsPerSecond: settings.audioBitsPerSecond
    };
    const recorder = new MediaRecorder(canvasStream, recorderOptions);
    const chunks = [];
    let drawing = true;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
    recorder.start(1000);

    const draw = () => {
      if (!drawing) return;
      drawVideoFrame(context, els.videoPlayer, settings);
      requestAnimationFrame(draw);
    };
    draw();

    for (let index = 0; index < cuts.length; index += 1) {
      await playCutForExport(cuts[index], (ratio) => {
        const base = index / cuts.length;
        const next = (base + ratio / cuts.length) * 92;
        setExportProgress(4 + next);
      });
    }

    drawing = false;
    recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    const url = URL.createObjectURL(blob);
    const fileName = `${slugify(project.title)}-${slugify(settings.label)}-${Date.now()}.webm`;
    els.downloadExportLink.href = url;
    els.downloadExportLink.download = fileName;
    els.downloadExportLink.hidden = false;
    els.downloadExportLink.textContent = "Baixar video final";
    setExportProgress(100);
    els.exportStatus.textContent = "Exportacao concluida.";

    project.status = "Exportado local";
    project.updatedAt = new Date().toISOString();
    state.exports.unshift({
      id: `export-${Date.now()}`,
      projectId: project.id,
      title: project.title,
      fileName,
      format: `${els.exportFormatInput.value} / ${els.exportQualityInput.value}`,
      createdAt: new Date().toISOString()
    });
    saveProjects();
    saveExports();
    renderAll();
  } catch (error) {
    els.exportStatus.textContent = error instanceof Error ? error.message : "Falha ao exportar.";
  } finally {
    els.videoPlayer.volume = previousVolume;
    els.videoPlayer.muted = previousMuted;
    els.exportVideoButton.disabled = false;
  }
}

function getVideoExportSettings(project, format, quality) {
  const presets = {
    Alta: { maxLongSide: 1920, videoBitsPerSecond: 6000000, audioBitsPerSecond: 160000, fps: 30 },
    Media: { maxLongSide: 1280, videoBitsPerSecond: 3000000, audioBitsPerSecond: 128000, fps: 30 },
    Baixa: { maxLongSide: 854, videoBitsPerSecond: 1200000, audioBitsPerSecond: 96000, fps: 24 }
  };
  const preset = presets[quality] || presets.Alta;

  if (format === "Vertical 9:16") {
    const width = quality === "Baixa" ? 480 : quality === "Media" ? 720 : 1080;
    return { ...preset, width, height: Math.round(width * 16 / 9), fit: "cover", label: `${format}-${quality}` };
  }

  if (format === "Quadrado 1:1") {
    const width = quality === "Baixa" ? 480 : quality === "Media" ? 720 : 1080;
    return { ...preset, width, height: width, fit: "cover", label: `${format}-${quality}` };
  }

  if (format === "Horizontal 16:9") {
    const width = quality === "Baixa" ? 854 : quality === "Media" ? 1280 : 1920;
    return { ...preset, width, height: Math.round(width * 9 / 16), fit: "contain", label: `${format}-${quality}` };
  }

  const sourceWidth = project.width || 1280;
  const sourceHeight = project.height || 720;
  const scale = Math.min(1, preset.maxLongSide / Math.max(sourceWidth, sourceHeight));
  return {
    ...preset,
    width: Math.max(2, Math.round(sourceWidth * scale)),
    height: Math.max(2, Math.round(sourceHeight * scale)),
    fit: "contain",
    label: `${format}-${quality}`
  };
}

function drawVideoFrame(context, video, settings) {
  const canvas = context.canvas;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sourceWidth = video.videoWidth || canvas.width;
  const sourceHeight = video.videoHeight || canvas.height;
  const scale =
    settings.fit === "cover"
      ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
      : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const x = (canvas.width - drawWidth) / 2;
  const y = (canvas.height - drawHeight) / 2;

  context.drawImage(video, x, y, drawWidth, drawHeight);
}

function playCutForExport(cut, onProgress) {
  return new Promise((resolve, reject) => {
    const video = els.videoPlayer;
    let done = false;

    const cleanup = () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("error", onError);
    };

    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      video.pause();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Falha ao reproduzir o video."));
    };

    const onTime = () => {
      const ratio = Math.min(1, Math.max(0, (video.currentTime - cut.startTime) / (cut.endTime - cut.startTime)));
      onProgress(ratio);
      if (video.currentTime >= cut.endTime) finish();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("error", onError);
    video.currentTime = cut.startTime;
    video.play().then(() => {
      window.setTimeout(finish, Math.max(1000, (cut.endTime - cut.startTime + 0.35) * 1000));
    }).catch(reject);
  });
}

function downloadCaptions(type) {
  const project = getActiveProject();
  if (!project) return;
  const content = type === "srt" ? toSrt(project.transcript) : toVtt(project.transcript);
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), `${slugify(project.title)}.${type}`);
}

async function downloadAudio(type) {
  const project = getActiveProject();
  if (!project || !state.currentFile) {
    els.exportStatus.textContent = "Abra um projeto com video importado para baixar audio.";
    return;
  }

  const cuts = project.cuts.filter((cut) => cut.isSelected).sort((a, b) => a.orderIndex - b.orderIndex);
  if (!cuts.length) {
    els.exportStatus.textContent = "Selecione pelo menos um corte para gerar audio.";
    return;
  }

  els.exportStatus.textContent = `Gerando ${type.toUpperCase()} no navegador...`;
  els.exportVideoButton.disabled = true;

  try {
    const audioData = await buildSelectedAudioData(state.currentFile, cuts);
    if (type === "wav") {
      const wavBlob = encodeWav(audioData.samples, audioData.sampleRate);
      downloadBlob(wavBlob, `${slugify(project.title)}-${Date.now()}.wav`);
    } else {
      if (!window.lamejs) {
        throw new Error("Biblioteca MP3 nao carregou. Tente novamente ou baixe WAV.");
      }
      const mp3Blob = encodeMp3(audioData.samples, audioData.sampleRate);
      downloadBlob(mp3Blob, `${slugify(project.title)}-${Date.now()}.mp3`);
    }
    els.exportStatus.textContent = `${type.toUpperCase()} pronto para download.`;
  } catch (error) {
    els.exportStatus.textContent =
      error instanceof Error ? error.message : "Nao foi possivel gerar o audio.";
  } finally {
    els.exportVideoButton.disabled = false;
  }
}

async function buildSelectedAudioData(file, cuts) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Este navegador nao suporta processamento de audio local.");

  const context = new AudioContextClass();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  const sampleRate = audioBuffer.sampleRate;
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  const pieces = [];
  let totalLength = 0;

  cuts.forEach((cut) => {
    const start = Math.max(0, Math.floor(cut.startTime * sampleRate));
    const end = Math.min(audioBuffer.length, Math.floor(cut.endTime * sampleRate));
    const length = Math.max(0, end - start);
    if (!length) return;

    const mono = new Int16Array(length);
    for (let i = 0; i < length; i += 1) {
      let sample = 0;
      for (const channel of channels) sample += channel[start + i] || 0;
      sample /= channels.length || 1;
      mono[i] = Math.max(-1, Math.min(1, sample)) * 32767;
    }
    pieces.push(mono);
    totalLength += mono.length;
  });

  await context.close();

  if (!totalLength) throw new Error("Nao ha audio nos cortes selecionados.");

  const samples = new Int16Array(totalLength);
  let offset = 0;
  pieces.forEach((piece) => {
    samples.set(piece, offset);
    offset += piece.length;
  });

  return { samples, sampleRate };
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function encodeMp3(samples, sampleRate) {
  const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, 128);
  const chunks = [];
  const blockSize = 1152;

  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) chunks.push(encoded);
  }

  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) chunks.push(finalChunk);

  return new Blob(chunks, { type: "audio/mpeg" });
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function downloadJson(project) {
  downloadBlob(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
    `${slugify(project.title)}-plano-cortes.json`
  );
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function generateSmartCuts(duration, targetDuration, contentType, objective, transcript) {
  const safeDuration = Math.max(6, duration);
  const cutDuration = Math.min(Math.max(6, targetDuration), Math.max(6, safeDuration * 0.82));
  const anchors = [0.08, 0.28, 0.5, 0.7, 0.84];
  const titles = [
    "Melhor gancho do video",
    "Momento com contexto completo",
    "Trecho forte para redes sociais",
    "Resumo com ritmo bom",
    "Fechamento com impacto"
  ];

  return anchors.map((anchor, index) => {
    const center = safeDuration * anchor;
    const start = Math.max(0, Math.min(safeDuration - 1, center - cutDuration * 0.36));
    const end = Math.min(safeDuration, Math.max(start + 2, start + cutDuration));
    const excerpt = transcript
      .filter((segment) => segment.endTime >= start && segment.startTime <= end)
      .map((segment) => segment.text)
      .join(" ");

    return {
      id: `cut-${Date.now()}-${index}`,
      startTime: roundTime(start),
      endTime: roundTime(end),
      duration: roundTime(end - start),
      title: titles[index],
      description: `Corte sugerido para ${objective.toLowerCase()}.`,
      reason: `Mock local combinando ${contentType.toLowerCase()}, ritmo e ponto natural de entrada.`,
      score: Math.max(72, 94 - index * 5),
      tags: [contentType.toLowerCase(), objective.toLowerCase(), "local"],
      transcriptExcerpt: excerpt,
      isSelected: true,
      orderIndex: index,
      createdBy: "local-ai"
    };
  });
}

function generateTranscript(duration, contentType, objective) {
  const safeDuration = Math.max(6, duration);
  const size = Math.max(5, Math.min(22, safeDuration / 6));
  const texts = [
    `Abertura com contexto de ${contentType.toLowerCase()} e preparacao para ${objective.toLowerCase()}.`,
    "Explicacao clara com ritmo constante e boa continuidade narrativa.",
    "Momento com aumento de energia e potencial para prender atencao.",
    "Trecho central com detalhe importante e fechamento natural da ideia.",
    "Conclusao do bloco com frase forte e bom gancho de compartilhamento."
  ];
  const segments = [];

  for (let start = 0, index = 0; start < safeDuration; start += size, index += 1) {
    const end = Math.min(safeDuration, start + size);
    segments.push({
      id: `segment-${Date.now()}-${index}`,
      startTime: roundTime(start),
      endTime: roundTime(end),
      text: texts[index % texts.length],
      confidence: 0.86
    });
  }

  return segments;
}

function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nao foi possivel ler o video."));
    };
    video.src = url;
  });
}

function generateThumbnail(file, duration) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(0.2, duration * 0.12), Math.max(0.2, duration - 0.2));
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = 720;
      canvas.height = Math.round((height / width) * canvas.width);
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("./assets/hero-smart-cut.png");
    };
    video.src = url;
  });
}

function desiredDurationToSeconds(value) {
  if (value.includes("30")) return 30;
  if (value.includes("1 minuto")) return 60;
  if (value.includes("3")) return 180;
  if (value.includes("5")) return 300;
  if (value.includes("10")) return 600;
  return 60;
}

function getActiveProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || null;
}

function getSelectedCut() {
  return getActiveProject()?.cuts.find((cut) => cut.id === state.selectedCutId) || null;
}

function duplicateProject(id) {
  const original = state.projects.find((project) => project.id === id);
  if (!original) return;
  const copy = structuredClone(original);
  copy.id = `project-${Date.now()}`;
  copy.title = `${original.title} - copia`;
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();
  state.projects.unshift(copy);
  saveProjects();
  renderAll();
}

async function deleteProject(id) {
  const ok = window.confirm("Excluir este projeto local?");
  if (!ok) return;
  state.projects = state.projects.filter((project) => project.id !== id);
  state.exports = state.exports.filter((item) => item.projectId !== id);
  if (state.activeProjectId === id) {
    state.activeProjectId = null;
    revokeCurrentObjectUrl();
  }
  await deleteVideoFile(id);
  saveProjects();
  saveExports();
  renderAll();
}

async function clearLocalData() {
  const ok = window.confirm("Limpar todos os projetos locais deste navegador?");
  if (!ok) return;
  state.projects = [];
  state.exports = [];
  state.activeProjectId = null;
  revokeCurrentObjectUrl();
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(EXPORTS_KEY);
  await clearVideoStore();
  renderAll();
  showView("upload");
}

function saveProjects() {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects));
}

function saveExports() {
  localStorage.setItem(EXPORTS_KEY, JSON.stringify(state.exports));
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("videos");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoFile(id, file) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").put(file, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadVideoFile(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readonly");
    const request = tx.objectStore("videos").get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteVideoFile(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function clearVideoStore() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    tx.objectStore("videos").clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function revokeCurrentObjectUrl() {
  if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
  state.currentObjectUrl = null;
  state.currentFile = null;
  els.videoPlayer.removeAttribute("src");
}

function toSrt(segments) {
  return segments
    .map((segment, index) => `${index + 1}\n${srtTime(segment.startTime)} --> ${srtTime(segment.endTime)}\n${segment.text}\n`)
    .join("\n");
}

function toVtt(segments) {
  return `WEBVTT\n\n${segments
    .map((segment) => `${vttTime(segment.startTime)} --> ${vttTime(segment.endTime)}\n${segment.text}\n`)
    .join("\n")}`;
}

function srtTime(seconds) {
  return vttTime(seconds).replace(".", ",");
}

function vttTime(seconds) {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  const ms = Math.floor((total % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSocialPlatformUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "instagr.am"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function hasVideoExtension(value) {
  try {
    const path = new URL(value).pathname.toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".mkv"].some((extension) => path.endsWith(extension));
  } catch {
    return false;
  }
}

function fileNameFromUrl(value) {
  try {
    const url = new URL(value);
    const lastPart = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    const fileName = lastPart && /\.[a-z0-9]{2,5}$/i.test(lastPart) ? lastPart : "system-smart-cut-video.mp4";
    return fileName.replace(/[<>:"/\\|?*]+/g, "-");
  } catch {
    return "system-smart-cut-video.mp4";
  }
}

function mimeFromFileName(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const types = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    mkv: "video/x-matroska"
  };
  return types[extension] || "video/mp4";
}

function socialTitleFromUrl(value) {
  const host = new URL(value).hostname.toLowerCase();
  if (host.includes("youtube") || host.includes("youtu.be")) return "Link do YouTube";
  if (host.includes("tiktok")) return "Link do TikTok";
  if (host.includes("instagram") || host.includes("instagr.am")) return "Link do Instagram";
  return "Link social";
}

function pickRecorderMimeType() {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function setExportProgress(value) {
  els.exportProgressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function formatSeconds(seconds) {
  const rounded = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes || 0;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function roundTime(value) {
  return Number(value.toFixed(1));
}

function slugify(value) {
  return String(value || "system-smart-cut")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
