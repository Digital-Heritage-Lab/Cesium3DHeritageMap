/**
 * AIChatBot.js
 * A simple AI Chatbot interface for controlling the Cesium 3D Map.
 * Refactored for extensibility using a Command Registry pattern.
 */

class HeritageAIChat {
    constructor(viewer) {
        this.viewer = viewer;
        this.commands = this.registerCommands();
        this.initUI();
        this.bindEvents();
    }

    /**
     * Registers all available commands.
     * @returns {Array} Array of command objects { keywords: [], handler: function, description: string }
     */
    registerCommands() {
        const commands = [
            // --- Navigation ---
            {
                keywords: ['fly to', 'zoom to', 'go to'],
                handler: (text) => this.handleFlyTo(text),
                description: 'Navigates to a specific location.'
            },
            // --- Layers ---
            {
                keywords: ['show', 'enable', 'switch to'],
                handler: (text) => this.handleLayerControl(text, true),
                description: 'Shows or enables a specific map layer.'
            },
            {
                keywords: ['hide', 'disable'],
                handler: (text) => this.handleLayerControl(text, false),
                description: 'Hides or disables a specific map layer.'
            },
            // --- Time ---
            {
                keywords: ['time', 'set time'],
                handler: (text) => this.handleTimeControl(text),
                description: 'Sets the time of day (morning, noon, evening, night).'
            },
            // --- Filters ---
            {
                keywords: ['filter', 'show only'],
                handler: (text) => this.handleFilterControl(text),
                description: 'Filters markers by type (3d models, photos, etc).'
            },
            // --- Tour ---
            {
                keywords: ['start tour', 'tour'],
                handler: () => this.startTour(),
                description: 'Starts a guided tour of Cologne.'
            },
            // --- Greeting ---
            {
                keywords: ['hello', 'hi', 'hey'],
                handler: () => "Hello there! Ready to explore Cologne's heritage?",
                description: 'Greets the user.'
            },
            // --- Help ---
            {
                keywords: ['help', 'what can you do'],
                handler: () => this.getHelpMessage(),
                description: 'Shows available commands.'
            }
        ];

        // --- Reset ---
        const resetCmd = {
            keywords: ['reset', 'clear', 'restart', 'delete history'],
            handler: () => {
                this.clearHistory();
                return null; // Don't add a message, clearHistory already adds the initial greeting
            },
            description: 'Clears the chat history.'
        };

        return [...commands, resetCmd];
    }

    initUI() {
        // Remove existing panel if present to ensure updates are applied
        const existingPanel = document.getElementById('aiChatPanel');
        if (existingPanel) existingPanel.remove();

        const chatPanel = document.createElement('div');
        chatPanel.id = 'aiChatPanel';
        chatPanel.className = 'panel';
        chatPanel.style.display = 'none';

        // Header
        const header = document.createElement('div');
        header.id = 'aiChatHeader';

        const title = document.createElement('h2');
        title.textContent = 'GeoAI Assistant';

        const actions = document.createElement('div');
        actions.className = 'header-actions';

        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearChatBtn'; // Added ID for easier debugging
        clearBtn.className = 'clear-chat-btn'; // changed class for specific styling
        clearBtn.textContent = 'Clear Chat'; // Changed from icon to text
        clearBtn.onclick = () => this.clearHistory();

        const closeBtn = document.createElement('button');
        closeBtn.id = 'closeAiChatPanel';
        closeBtn.className = 'header-btn';
        closeBtn.innerHTML = '×';

        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(actions);

        // Chat History Area
        const chatHistory = document.createElement('div');
        chatHistory.id = 'aiChatHistory';

        // Scroll to Bottom Button
        const scrollBtn = document.createElement('div');
        scrollBtn.id = 'scrollToBottomBtn';
        scrollBtn.innerHTML = '↓';
        scrollBtn.onclick = () => this.scrollToBottom(true);
        chatHistory.appendChild(scrollBtn);

        // Quick Actions Area
        const quickActions = document.createElement('div');
        quickActions.id = 'aiQuickActions';

        const quickActionsList = [
            { label: '📍 Cologne', cmd: 'Fly to Cologne' },
            { label: '🏢 3D Buildings', cmd: 'Show 3D Buildings' },
            { label: '🚀 Start Tour', cmd: 'Start tour' },
            { label: '❓ Help', cmd: 'help' }
        ];

        quickActionsList.forEach(act => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.textContent = act.label;
            btn.onclick = () => {
                this.inputField.value = act.cmd;
                this.processInput();
            };
            quickActions.appendChild(btn);
        });

        // Input Area
        const inputArea = document.createElement('div');
        inputArea.id = 'aiInputArea';

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = 'aiChatInput';
        inputField.placeholder = 'Type a command (e.g., "Fly to Cologne")...';

        const sendBtn = document.createElement('button');
        sendBtn.id = 'aiSendBtn';
        sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;

        inputArea.appendChild(inputField);
        inputArea.appendChild(sendBtn);

        chatPanel.appendChild(header);
        chatPanel.appendChild(chatHistory);
        chatPanel.appendChild(quickActions);
        chatPanel.appendChild(inputArea);

        document.body.appendChild(chatPanel);

        this.chatPanel = chatPanel;
        this.chatHistory = chatHistory;
        this.inputField = inputField;
        this.closeBtn = closeBtn;
        this.sendBtn = sendBtn;
        this.scrollBtn = scrollBtn;

        this.addInitialMessage();
    }

    addInitialMessage() {
        this.addMessage("Hello! I am your GeoAI Assistant. I can help you navigate Cologne, change map layers, or filter markers by type.", 'ai');
    }

    clearHistory() {
        // Clear DOM directly
        this.chatHistory.innerHTML = '';

        // Re-create scroll button to ensure it works
        const scrollBtn = document.createElement('div');
        scrollBtn.id = 'scrollToBottomBtn';
        scrollBtn.innerHTML = '↓';
        scrollBtn.onclick = () => this.scrollToBottom(true);
        this.scrollBtn = scrollBtn; // Update reference

        this.chatHistory.appendChild(scrollBtn);

        this.addInitialMessage();
    }

    bindEvents() {
        this.closeBtn.onclick = () => this.toggleChat(false);
        this.sendBtn.onclick = () => this.processInput();
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processInput();
        });

        // Scroll listener for "Scroll to Bottom" button
        this.chatHistory.onscroll = () => {
            const isScrolledUp = this.chatHistory.scrollHeight - this.chatHistory.scrollTop - this.chatHistory.clientHeight > 100;
            this.scrollBtn.style.display = isScrolledUp ? 'flex' : 'none';
        };
    }

    toggleChat(show) {
        this.chatPanel.style.display = show ? 'flex' : 'none';
        if (show) {
            this.inputField.focus();
            this.scrollToBottom(false);
        }
    }

    addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.textContent = text;
        this.chatHistory.appendChild(msgDiv);
        this.scrollToBottom();
    }

    scrollToBottom(smooth = true) {
        // Use requestAnimationFrame to ensure the DOM has updated and scrollHeight is accurate
        requestAnimationFrame(() => {
            this.chatHistory.scrollTo({
                top: this.chatHistory.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        });
    }

    processInput() {
        const text = this.inputField.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        this.inputField.value = '';

        // Simulate "thinking" delay for realism
        this.showTypingIndicator();
        setTimeout(() => {
            this.hideTypingIndicator();
            this.interpretCommand(text);
        }, 600);
    }

    showTypingIndicator() {
        // Simple visual feedback
        const indicator = document.createElement('div');
        indicator.id = 'aiTypingIndicator';
        indicator.className = 'chat-message ai logging';
        indicator.textContent = 'GeoAI is thinking...';
        this.chatHistory.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) indicator.remove();
    }

    async interpretCommand(text) {
        const lowerText = text.toLowerCase();
        let response = undefined; // Use undefined to indicate "no command found"
        let commandFound = false;

        // Iterate through registered commands
        for (const cmd of this.commands) {
            if (cmd.keywords.some(k => lowerText.includes(k))) {
                commandFound = true;
                try {
                    // Result can be a string (message), null (no message), or a promise
                    const result = cmd.handler(lowerText);
                    if (result instanceof Promise) {
                        response = await result;
                    } else {
                        response = result;
                    }
                } catch (e) {
                    console.error("Command execution error:", e);
                    response = "I encountered an error trying to do that.";
                }
                break; // Stop after first match
            }
        }

        // Only show "unknown command" if no command was found
        if (!commandFound) {
            response = "I'm not sure how to do that. Try 'help' to see what I can do.";
        }

        // Only add message if response is not null (some commands like reset handle their own messaging)
        if (response !== null && response !== undefined) {
            this.addMessage(response, 'ai');
        }
    }

    // --- Command Handlers ---

    getHelpMessage() {
        return "I can help you:\n- Navigation: 'Fly to Cologne', 'Go to Cathedral'\n- Layers: 'Show Aerial', 'Show 3D Buildings'\n- Filters: 'Show only 3D models'\n- Tours: 'Start tour'\n- System: 'Reset chat'";
    }

    async handleFlyTo(text) {
        const cleanText = text.replace(/fly to|zoom to|go to/g, '').trim();

        // Check for aliases
        if (cleanText.includes('dom') || cleanText.includes('cathedral')) {
            this.flyToLocation(6.9583, 50.9413, 1000, 0, -45);
            return "Flying to Cologne Cathedral.";
        }
        if (cleanText.includes('cologne') || cleanText.includes('köln')) {
            this.flyToLocation(6.9583, 50.9413, 5000, 0, -60);
            return "Flying to Cologne.";
        }

        // Geocoder fallback
        try {
            const geocoder = new Cesium.IonGeocodeProvider({ scene: this.viewer.scene });
            const results = await geocoder.geocode(cleanText);
            if (results && results.length > 0) {
                const bestResult = results[0];
                this.viewer.camera.flyTo({ destination: bestResult.destination });
                return `Flying to ${bestResult.displayName}...`;
            } else {
                return `I couldn't find "${cleanText}".`;
            }
        } catch (e) {
            console.error(e);
            return "Search unavailable right now.";
        }
    }

    flyToLocation(lon, lat, height, heading, pitch) {
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: Cesium.Math.toRadians(heading),
                pitch: Cesium.Math.toRadians(pitch),
                roll: 0
            }
        });
    }

    handleLayerControl(text, enable) {
        if (text.includes('osm') || text.includes('openstreetmap')) {
            this.setBaseMap('osm');
            return "Switched to OpenStreetMap.";
        }
        if (text.includes('aerial') || text.includes('satellite')) {
            this.setBaseMap('ion-aerial');
            return "Switched to Aerial view.";
        }
        if (text.includes('google')) {
            this.setBaseMap('google-photorealistic');
            // If switching to Google, we might want to disable local buildings to avoid clash
            // But let's keep logic simple for now
            return "Switched to Google Photorealistic 3D.";
        }
        if (text.includes('buildings')) {
            const checkbox = document.getElementById('lodData');
            if (checkbox) {
                if (checkbox.checked !== enable) {
                    checkbox.click(); // Using click to ensure event listeners fire
                }
                return enable ? "Enabled 3D OSM Buildings." : "Disabled 3D OSM Buildings.";
            }
        }
        return "I can control OSM, Aerial, Google 3D, and OSM Buildings.";
    }

    setBaseMap(value) {
        const select = document.getElementById('baseMapSelect');
        if (select) {
            select.value = value;
            select.dispatchEvent(new Event('change'));
        }
    }

    handleTimeControl(text) {
        let hour = 12;
        let label = "noon";

        if (text.includes('morning')) { hour = 9; label = "morning"; }
        else if (text.includes('evening') || text.includes('sunset')) { hour = 18; label = "evening"; }
        else if (text.includes('night') || text.includes('midnight')) { hour = 0; label = "midnight"; }

        const now = Cesium.JulianDate.now();
        const today = Cesium.JulianDate.toDate(now);
        today.setHours(hour, 0, 0, 0);
        this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(today);

        return `Time set to ${label}.`;
    }

    handleFilterControl(text) {
        if (text.includes('models') || text.includes('3d')) {
            this.triggerFilter('3dmodel');
            return "Showing only 3D Models.";
        }
        if (text.includes('photos')) {
            this.triggerFilter('photo');
            return "Showing only Photos.";
        }
        if (text.includes('all')) {
            this.triggerFilter('allMarkers');
            return "Showing all markers.";
        }
        return "I can filter by 'models', 'photos', or 'all'.";
    }

    triggerFilter(id) {
        const radio = document.getElementById(id);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }
    }

    async startTour() {
        // Enable Google Photorealistic 3D for the tour
        this.addMessage("Switching to Google Photorealistic 3D for tour...", 'ai');
        this.setBaseMap('google-photorealistic');

        const locations = [
            // Corrected view for Cologne Cathedral (Dom) - Moved back ~700m total
            { name: "Cologne Cathedral", lat: 50.9413, lon: 6.950, height: 350, heading: 90, pitch: -20 },
            // Corrected view for Great St. Martin Church - Moved back ~700m total
            { name: "Great St. Martin Church", lat: 50.9373, lon: 6.955, height: 250, heading: 90, pitch: -20 },
            // Severinstorburg - Reverted to original view
            { name: "Severinstorburg", lat: 50.9234, lon: 6.9592, height: 300, heading: 180, pitch: -45 }
        ];

        // We return a promise that resolves immediately with a start message, 
        // but the tour continues in background.
        // However, to keep it clean, let's just run it.

        // We can't await inside the main loop easily without blocking the UI if we're not careful,
        // but here we are async.

        for (const loc of locations) {
            this.addMessage(`Visiting ${loc.name}...`, 'ai');
            this.flyToLocation(loc.lon, loc.lat, loc.height, loc.heading, loc.pitch);
            await new Promise(r => setTimeout(r, 8000));
        }

        // Revert to default base map (Cesium ION Aerial)
        this.addMessage("Tour finished! Switching back to default view.", 'ai');
        this.setBaseMap('ion-aerial'); // Assuming 'ion-aerial' is the default

        return "Tour completed.";
    }
}
