/* Reuses the existing chat lifecycle. Clear map commands run locally through GreenAITools; the
   language model only interprets other questions and can only request allowlisted actions. */
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
    )}</button></div><label class="ai-disclosure"><input type="checkbox" id="aiRemoteMode"> Komplexe Fragen an externe KI (OpenRouter) senden. Übertragen werden Frage, Verlauf und bis zu 25 sichtbare Orte; Kartenbefehle laufen lokal.</label>`;
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
      `Was möchtest du über das Kölner Grün wissen? Ich kann Themen einblenden, ${GreenData.dataMode === "osm" ? "OSM-Orte" : "Demo-Orte"} und Bäume im Kartenausschnitt zählen und auflisten, essbare Bäume und Grünmeldungen zeigen und Orte in deiner Nähe finden.`,
      "ai"
    );
  }
  updatePrompts() {
    const active = GreenAtlas.getActiveTheme(),
      theme = GreenData.theme(active);
    const defaults = [
      ["tree", "Bäume hier entdecken"],
      ["tree", "Essbare Bäume zeigen"],
      ["play", "Spielplätze in der Nähe"],
      ["report", "Grünmeldungen anzeigen"],
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
      let local;
      try {
        local = await GreenAtlas.aiLocal(text);
      } catch (error) {
        console.warn("[GreenAI] local action failed", error);
        this.addMessage("Die Kartenaktion konnte nicht ausgeführt werden.", "ai");
        return;
      }
      if (local) {
        this.addMessage(local, "ai");
        return;
      }
      if (!document.getElementById("aiRemoteMode").checked) {
        this.addMessage(
          "Diese Frage kann ich mit den lokalen Kartenbefehlen noch nicht beantworten. Probiere zum Beispiel „Zeige Brunnen“, „Wie viele Bäume sehe ich?“ oder „Zeige essbare Bäume“. Für komplexere Fragen kannst du unten die externe KI (OpenRouter) aktivieren.",
          "ai"
        );
        return;
      }
      await this.askModel(text);
    } catch (error) {
      console.warn("[GreenAI] request failed", error?.message);
      this.addMessage(
        error?.message === "not_configured"
          ? "Der KI-Server ist noch nicht konfiguriert. Themen und lokale Kartenaktionen funktionieren weiterhin."
          : "Der KI Dienst ist gerade nicht erreichbar. Lokale Kartensuche und Themenfunktionen funktionieren weiterhin.",
        "ai"
      );
    } finally {
      this.busy = false;
      this.sendBtn.disabled = false;
      this.hideTypingIndicator();
    }
  }
  // One request per question. The model returns an intent (an <action> block); numbers, lists and
  // distances in the visible answer always come from GreenAITools, never from the model text.
  async askModel(text) {
    console.debug("[GreenAI] remote intent");
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    let data;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: "system", content: GreenAITools.buildSystemPrompt() },
            ...this.conversation.slice(-10),
            { role: "user", content: text },
          ],
        }),
      });
      if (!response.ok)
        throw new Error(response.status === 503 ? "not_configured" : "unavailable");
      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }
    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    if (!reply) throw new Error("empty");
    this.conversation.push(
      { role: "user", content: text },
      { role: "assistant", content: reply }
    );
    this.conversation = this.conversation.slice(-12);
    const { action, displayText } = this.extractAction(reply);
    if (action) {
      this.addMessage((await GreenAITools.run(action)).message, "ai");
    } else if (/<action>/i.test(reply)) {
      console.warn("[GreenAI] action rejected: unreadable action block");
      this.addMessage("Diese Aktion kann ich nicht ausführen.", "ai");
    } else {
      this.addMessage(
        displayText.slice(0, 800) || "Das habe ich nicht verstanden. Formuliere die Frage bitte anders.",
        "ai"
      );
    }
  }
};
