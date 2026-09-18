/* Reuses the existing chat lifecycle; local map commands never require an LLM. */
window.GreenAI = class GreenAI extends HeritageAIChat {
  registerCommands() {
    return [];
  }
  initUI() {
    const { icon } = GreenAtlas;
    const panel = document.createElement("section");
    panel.id = "aiChatPanel";
    panel.setAttribute("aria-label", "GrünAI Assistent");
    panel.hidden = true;
    panel.innerHTML = `<div class="green-ai-header"><span class="ai-emblem">${icon(
      "sparkles"
    )}</span><div><h2>GrünAI</h2><small>DEIN GRÜNES KÖLN. EIN GESPRÄCH ENTFERNT.</small></div><button id="closeAiChatPanel" class="icon-button" aria-label="GrünAI schließen">${icon(
      "close"
    )}</button></div><p class="ai-description">Dein Assistent für das Kölner Stadtgrün.</p><div id="aiChatHistory" role="log" aria-live="polite" aria-label="Chatverlauf"><div id="scrollToBottomBtn"></div></div><div id="aiQuickActions"></div><div id="aiInputArea"><input id="aiChatInput" placeholder="Frag GrünAI …" aria-label="Frage an GrünAI" maxlength="2000"><button id="aiSendBtn" aria-label="Frage senden">${icon(
      "send"
    )}</button></div><label class="ai-disclosure"><input type="checkbox" id="aiRemoteMode"> Freie Fragen an den KI-Server senden</label>`;
    document.getElementById("mapWorkspace").appendChild(panel);
    this.chatPanel = panel;
    this.chatHistory = panel.querySelector("#aiChatHistory");
    this.inputField = panel.querySelector("#aiChatInput");
    this.closeBtn = panel.querySelector("#closeAiChatPanel");
    this.sendBtn = panel.querySelector("#aiSendBtn");
    this.scrollBtn = panel.querySelector("#scrollToBottomBtn");
    this.addInitialMessage();
    this.updatePrompts();
  }
  addInitialMessage() {
    this.addMessage(
      `Was möchtest du über das Kölner Grün wissen? Ich kann Themen einblenden und ${GreenData.dataMode === "osm" ? "OSM-Orte" : "Demo-Orte"} im aktuellen Kartenausschnitt finden.`,
      "ai"
    );
  }
  updatePrompts() {
    const active = GreenAtlas.getActiveTheme(),
      theme = GreenData.theme(active);
    const defaults = [
      ["tree", "Bäume hier entdecken"],
      ["play", "Spielplätze in der Nähe"],
      ["dog", "Hundeauslauf finden"],
      ["park", "Grünflächen anzeigen"],
      ["water", "Brunnen entdecken"],
      ["arch", "Friedhöfe erkunden"],
    ];
    const prompts = theme
      ? theme.prompts.map((p) => [theme.icon, p])
      : defaults;
    const container = document.getElementById("aiQuickActions");
    container.replaceChildren();
    for (const [glyph, text] of prompts) {
      const button = document.createElement("button");
      button.className = "quick-action-btn";
      button.innerHTML = GreenAtlas.icon(glyph) + GreenAtlas.escape(text);
      button.onclick = () => {
        this.inputField.value = text;
        this.processInput();
      };
      container.appendChild(button);
    }
  }
  bindEvents() {
    super.bindEvents();
    this.closeBtn.onclick = () => {
      GreenAtlas.closeAI();
      document.getElementById("greenAIButton").focus();
    };
  }
  processInput() {
    if (this.busy) return;
    super.processInput();
  }
  showTypingIndicator() {
    super.showTypingIndicator();
    document.getElementById("aiTypingIndicator").textContent = "GrünAI sucht …";
  }
  async routeInput(text) {
    this.busy = true;
    this.sendBtn.disabled = true;
    try {
      const local = GreenAtlas.aiLocal(text);
      if (local) {
        this.addMessage(local, "ai");
        return;
      }
      if (!document.getElementById("aiRemoteMode").checked) {
        this.addMessage(
          "Diese Frage kann ich mit den lokalen Kartendaten noch nicht beantworten. Probiere „Was sehe ich auf der Karte?“ oder wähle ein Thema. Für freie Fragen kannst du unten den vorhandenen KI-Server aktivieren.",
          "ai"
        );
        return;
      }
      const controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const context = GreenAtlas.getContext().slice(0, 30).map((f) => ({
          name: f.properties.name,
          theme: f.properties.theme,
          source: f.properties.source,
          dataAsOf: f.properties.dataAsOf || null,
        }));
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "Du bist GrünAI für Grün Atlas Köln. Antworte kurz auf Deutsch. Ortsdaten stammen aus einem begrenzten OpenStreetMap-Auszug oder sind explizite Demo-Daten. Erfinde keine Live-Daten, Pflegezustände, Trinkwasserqualität, Leinenregeln oder Zugänglichkeit. Du kannst hier keine Kartenaktionen ausführen. Gib keine Action-Tags aus. Kennzeichne Unsicherheit. Bis zu 30 sichtbare Orte: " +
                  JSON.stringify(context),
              },
              ...this.conversation.slice(-10),
              { role: "user", content: text },
            ],
          }),
        });
        if (!response.ok)
          throw new Error(
            response.status === 503 ? "not_configured" : "unavailable"
          );
        const data = await response.json();
        if (typeof data.reply !== "string" || !data.reply.trim())
          throw new Error("empty");
        this.addMessage(data.reply, "ai");
        this.conversation.push(
          { role: "user", content: text },
          { role: "assistant", content: data.reply }
        );
        this.conversation = this.conversation.slice(-12);
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.addMessage(
        error.message === "not_configured"
          ? "Der KI-Server ist noch nicht konfiguriert. Themen und lokale Kartenaktionen funktionieren weiterhin."
          : "Der KI-Dienst ist gerade nicht erreichbar. Nutze die lokalen Themen und Kartenaktionen.",
        "ai"
      );
    } finally {
      this.busy = false;
      this.sendBtn.disabled = false;
      this.hideTypingIndicator();
    }
  }
};
