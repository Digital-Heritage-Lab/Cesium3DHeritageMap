/* Reuses the existing chat lifecycle. Clear map commands run locally through GreenAITools; the
   language model only interprets other questions and can only request allowlisted actions. */
window.GreenAI = class GreenAI extends HeritageAIChat {
  registerCommands() {
    return [];
  }
  clearHistory() {
    super.clearHistory();
    this.sessionState = {};
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
      `Was möchtest du über das Kölner Grün wissen? Ich kann Kartenebenen steuern, ${GreenData.dataMode === "osm" ? "OSM-Orte" : "Demo-Orte"} filtern, Grünraumversorgung, Pflegemeldungen und Baumstrukturen analysieren, Stadtteile vergleichen und Orte in der Nähe eines bekannten Orts zeigen.`,
      "ai"
    );
  }
  updatePrompts() {
    const active = GreenAtlas.getActiveTheme(),
      theme = GreenData.theme(active);
    const defaults = [
      ["tree", "Bäume hier entdecken"],
      ["tree", "Essbare Bäume zeigen"],
      ["play", "Spielplätze in Ehrenfeld"],
      ["tree", "Die ältesten Bäume hier"],
      ["report", "Grünmeldungen anzeigen"],
      ["map", "Geoanalyse im Kartenausschnitt"],
      ["map", "Pflegelage im Kartenausschnitt"],
      ["tree", "Baumstruktur im Kartenausschnitt"],
      ["park", "Grünraum-Versorgungscheck in meiner Nähe"],
      ["water", "Nur Parks und Brunnen anzeigen"],
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
    this.sessionState ||= {};
    try {
      let local;
      try {
        local = await GreenAtlas.aiLocal(text, this.sessionState);
      } catch (error) {
        console.warn("[GreenAI] local action failed", error);
        this.addMessage("Die Kartenaktion konnte nicht ausgeführt werden.", "ai");
        return;
      }
      if (local) {
        this.addMessage(local.message, "ai");
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
  async requestModel(messages, timeoutMs = 15000) {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ messages }),
      });
      if (!response.ok)
        throw new Error(response.status === 503 ? "not_configured" : "unavailable");
      const data = await response.json();
      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("empty");
      return reply;
    } finally {
      clearTimeout(timeout);
    }
  }
  // Plan -> validated actions -> optional interpretation. The model returns a short reasoning
  // trace and intents in <action> blocks; numbers, lists and distances in the visible answer
  // always come from GreenAITools. The interpretation step is best effort and number-free.
  async askModel(text) {
    console.debug("[GreenAI] remote intent");
    const reply = await this.requestModel([
      { role: "system", content: GreenAITools.buildSystemPrompt(this.sessionState) },
      ...this.conversation.slice(-10),
      { role: "user", content: text },
    ]);
    const reasoning = GreenAITools.parseReasoning(reply);
    const actions = GreenAITools.parseActionBlocks(reply);
    const displayText = GreenAITools.stripModelTags(reply);
    this.conversation.push(
      { role: "user", content: text },
      { role: "assistant", content: reply.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim() }
    );
    this.conversation = this.conversation.slice(-12);
    if (actions === null) {
      console.warn("[GreenAI] action rejected: unreadable action block");
      this.addMessage("Diese Aktion kann ich nicht ausführen.", "ai");
      return;
    }
    if (!actions.length) {
      this.addAnalysis({
        answer: displayText.slice(0, 800) || "Das habe ich nicht verstanden. Formuliere die Frage bitte anders.",
        reasoning,
        note: displayText ? "Allgemeine KI-Antwort, nicht aus GrünAtlas-Daten geprüft." : "",
      });
      return;
    }
    const result = await GreenAITools.runActions(actions);
    GreenAITools.remember(this.sessionState, result);
    const trace = [
      ...reasoning,
      ...(result.actions || []).map((action) => `Geprüfte Aktion: ${GreenAITools.describeAction(action)}`),
    ];
    if (!result.ok) {
      this.addAnalysis({ answer: result.message, reasoning: trace });
      return;
    }
    this.addAnalysis({
      answer: result.message,
      reasoning: [...trace, "Zahlen und Listen stammen aus den geladenen GrünAtlas-Daten."],
      interpretation: await this.interpret(text, result.message),
    });
  }
  async interpret(question, resultText) {
    try {
      const reply = await this.requestModel([
        { role: "system", content: GreenAITools.buildInterpretPrompt() },
        { role: "user", content: `Frage: ${question.slice(0, 500)}\nGeprüftes Ergebnis:\n${resultText.slice(0, 1500)}` },
      ], 12000);
      return GreenAITools.withoutNumbers(GreenAITools.stripModelTags(reply));
    } catch (error) {
      console.debug("[GreenAI] interpretation skipped", error?.message);
      return "";
    }
  }
  // Plain-text rendering only; model text never reaches innerHTML.
  addAnalysis({ answer, reasoning = [], interpretation = "", note = "" }) {
    const message = document.createElement("div");
    message.className = "chat-message ai green-ai-analysis";
    const add = (tag, content, className) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      node.textContent = content;
      message.appendChild(node);
      return node;
    };
    add("div", answer);
    if (interpretation) add("p", interpretation, "ai-interpretation");
    if (note) add("p", note, "ai-note");
    if (reasoning.length) {
      const details = add("details", "", "ai-reasoning");
      const summary = document.createElement("summary");
      summary.textContent = "Denkweg anzeigen";
      const list = document.createElement("ol");
      for (const step of reasoning) {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      }
      details.append(summary, list);
    }
    this.chatHistory.appendChild(message);
    this.scrollToBottom();
  }
};
