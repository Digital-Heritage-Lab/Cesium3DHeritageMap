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
            // --- Search / Locate ---
            {
                keywords: ['find', 'search', 'locate', 'show me', 'where is'],
                handler: (text) => this.handleSearchCommand(text),
                description: 'Searches the monument database and shows the result on the map.'
            },
            // --- Navigation ---
            {
                keywords: ['fly to', 'zoom to', 'go to'],
                handler: (text) => this.handleFlyTo(text),
                description: 'Navigates to a specific location.'
            },
            // --- Filters ---
            {
                keywords: ['filter', 'show only', 'only show'],
                handler: (text) => this.handleFilterControl(text),
                description: 'Filters markers by type (3d models, photos, etc).'
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

        if (!commandFound) {
            try {
                const fallbackResponse = await this.handleSearchCommand(lowerText, { silentOnMiss: true });
                if (fallbackResponse) {
                    commandFound = true;
                    response = fallbackResponse;
                }
            } catch (e) {
                console.error("Search fallback error:", e);
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
        return "I can help you:\n- Navigation: 'Fly to Cologne', 'Go to Cathedral'\n- Database search: 'Find Dom', 'Search Severinstorburg', 'Show me monument 1234'\n- Layers: 'Show aerial', 'Show OSM', 'Show 3D buildings'\n- Filters: 'Show only 3D models', 'Show photos', 'Show all markers'\n- Tours: 'Start tour'\n- System: 'Reset chat'";
    }

    stripCommandPrefixes(text, prefixes) {
        let cleanedText = text;
        prefixes.forEach((prefix) => {
            cleanedText = cleanedText.replace(new RegExp(`\\b${prefix}\\b`, 'g'), ' ');
        });
        return cleanedText.replace(/\s+/g, ' ').trim();
    }

    normalizeSearchText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getPropertyValue(entity, propertyName) {
        if (!entity || !entity.properties || !entity.properties[propertyName]) {
            return '';
        }

        const property = entity.properties[propertyName];
        if (typeof property.getValue === 'function') {
            return property.getValue(Cesium.JulianDate.now()) || '';
        }

        return property || '';
    }

    getMonumentEntities() {
        const entities = [];
        const dataSources = this.viewer && this.viewer.dataSources;

        if (!dataSources) {
            return entities;
        }

        for (let i = 0; i < dataSources.length; i += 1) {
            const dataSource = dataSources.get(i);
            if (dataSource && dataSource.entities && dataSource.entities.values) {
                entities.push(...dataSource.entities.values);
            }
        }

        return entities;
    }

    getEntitySearchText(entity) {
        return [
            'kurzbezeichnung',
            'strasse',
            'hausnummer',
            'plz',
            'stadtbezirk',
            'kategorie',
            'denkmallistennummer'
        ]
            .map((propertyName) => this.getPropertyValue(entity, propertyName))
            .filter(Boolean)
            .join(' ');
    }

    findMonumentMatch(query) {
        const normalizedQuery = this.normalizeSearchText(query);
        if (!normalizedQuery) {
            return null;
        }

        const queryTerms = normalizedQuery.split(' ').filter((term) => term.length > 1);
        let bestMatch = null;
        let bestScore = 0;

        this.getMonumentEntities().forEach((entity) => {
            if (!entity || !entity.position) {
                return;
            }

            const shortTitle = this.normalizeSearchText(this.getPropertyValue(entity, 'kurzbezeichnung'));
            const monumentNumber = this.normalizeSearchText(this.getPropertyValue(entity, 'denkmallistennummer'));
            const searchText = this.normalizeSearchText(this.getEntitySearchText(entity));
            let score = 0;

            if (shortTitle === normalizedQuery || monumentNumber === normalizedQuery) {
                score += 120;
            } else if (shortTitle.includes(normalizedQuery)) {
                score += 90;
            } else if (searchText.includes(normalizedQuery)) {
                score += 65;
            }

            if (queryTerms.length > 0 && queryTerms.every((term) => searchText.includes(term))) {
                score += 35 + queryTerms.length * 5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = entity;
            }
        });

        return bestScore >= 35 ? bestMatch : null;
    }

    flyToEntity(entity) {
        this.viewer.selectedEntity = entity;
        this.viewer.flyTo(entity, {
            duration: 1.6,
            offset: new Cesium.HeadingPitchRange(
                0,
                Cesium.Math.toRadians(-45),
                650
            )
        });
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

        const monumentMatch = this.findMonumentMatch(cleanText);
        if (monumentMatch) {
            const title = String(this.getPropertyValue(monumentMatch, 'kurzbezeichnung') || cleanText)
                .trim()
                .replace(/^["']+|["']+$/g, '');
            this.flyToEntity(monumentMatch);
            return `Flying to ${title}.`;
        }

        // Geocoder fallback
        try {
            if (!Cesium.IonGeocoderService) {
                return `I couldn't find "${cleanText}" in the monument database. External Cesium search is unavailable right now.`;
            }

            const geocoder = new Cesium.IonGeocoderService({ scene: this.viewer.scene });
            const results = await geocoder.geocode(cleanText);
            if (results && results.length > 0) {
                const bestResult = results[0];
                const normalizedQuery = this.normalizeSearchText(cleanText);
                const resultName = this.normalizeSearchText(bestResult.displayName);
                const queryTerms = normalizedQuery.split(' ').filter((term) => term.length > 2);
                const hasUsefulMatch = resultName.includes(normalizedQuery)
                    || (queryTerms.length > 0 && queryTerms.every((term) => resultName.includes(term)));

                if (!hasUsefulMatch) {
                    return `I couldn't find "${cleanText}" in the monument database or Cesium search.`;
                }

                this.viewer.camera.flyTo({ destination: bestResult.destination });
                return `Flying to ${bestResult.displayName}...`;
            } else {
                return `I couldn't find "${cleanText}" in the monument database or Cesium search.`;
            }
        } catch (e) {
            console.error(e);
            return `I couldn't find "${cleanText}" in the monument database. External Cesium search is unavailable right now.`;
        }
    }

    async handleSearchCommand(text, options = {}) {
        const silentOnMiss = options.silentOnMiss === true;
        const cleanText = this.stripCommandPrefixes(text, [
            'find',
            'search',
            'locate',
            'show me',
            'where is',
            'monument',
            'database',
            'in database'
        ]).replace(/^the\s+/i, '');

        if (!cleanText) {
            return silentOnMiss ? null : "Tell me what you want to find in the monument database.";
        }

        const monumentMatch = this.findMonumentMatch(cleanText);
        if (!monumentMatch) {
            return silentOnMiss ? null : `I couldn't find "${cleanText}" in the monument database.`;
        }

        const title = String(this.getPropertyValue(monumentMatch, 'kurzbezeichnung') || cleanText)
            .trim()
            .replace(/^["']+|["']+$/g, '');
        const monumentNumber = String(this.getPropertyValue(monumentMatch, 'denkmallistennummer') || '').trim();
        const category = String(this.getPropertyValue(monumentMatch, 'kategorie') || '').trim();

        this.flyToEntity(monumentMatch);

        const details = [title];
        if (monumentNumber) {
            details.push(`#${monumentNumber}`);
        }
        if (category) {
            details.push(category);
        }

        return `Found ${details.join(' - ')}. Showing it on the map.`;
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
        const normalizedText = this.normalizeSearchText(text);
        const isHideIntent = !enable || /\bhide\b|\bdisable\b|\bturn off\b/.test(normalizedText);

        if (
            normalizedText.includes('all markers') ||
            normalizedText.includes('photo') ||
            normalizedText.includes('photos') ||
            normalizedText.includes('wikipedia') ||
            normalizedText.includes('wiki') ||
            normalizedText.includes('openstreetmap records') ||
            normalizedText.includes('osm records')
        ) {
            return this.handleFilterControl(text);
        }

        if (normalizedText.includes('osm buildings') || normalizedText.includes('openstreetmap buildings')) {
            const lodCheckbox = document.getElementById('lodData');
            if (lodCheckbox) {
                lodCheckbox.checked = !isHideIntent;
                lodCheckbox.dispatchEvent(new Event('change'));
                return isHideIntent ? "OpenStreetMap buildings hidden." : "OpenStreetMap buildings shown.";
            }
            return "OpenStreetMap building control is unavailable right now.";
        }

        if (normalizedText.includes('lod2') || normalizedText.includes('geobasis')) {
            const lod2Checkbox = document.getElementById('lodDataGeobasis');
            if (lod2Checkbox) {
                lod2Checkbox.checked = !isHideIntent;
                lod2Checkbox.dispatchEvent(new Event('change'));
                return isHideIntent ? "LoD2 Geobasis buildings hidden." : "LoD2 Geobasis buildings shown.";
            }
            return "LoD2 building control is unavailable right now.";
        }

        if (normalizedText.includes('osm') || normalizedText.includes('openstreetmap')) {
            this.setBaseMap('osm');
            return "Switched to OpenStreetMap.";
        }
        if (normalizedText.includes('aerial with labels') || normalizedText.includes('labels')) {
            this.setBaseMap('ion-aerial-labels');
            return "Switched to Aerial view with labels.";
        }
        if (normalizedText.includes('aerial') || normalizedText.includes('satellite') || normalizedText.includes('bing')) {
            this.setBaseMap('ion-aerial');
            return "Switched to Aerial view.";
        }
        if (normalizedText.includes('google')) {
            this.setBaseMap('google-photorealistic');
            return "Switched to Google Photorealistic 3D.";
        }
        if (normalizedText.includes('buildings') || normalizedText.includes('3d')) {
            if (isHideIntent) {
                const lodCheckbox = document.getElementById('lodData');
                const lod2Checkbox = document.getElementById('lodDataGeobasis');
                [lodCheckbox, lod2Checkbox].forEach((checkbox) => {
                    if (checkbox) {
                        checkbox.checked = false;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
                return "Building layers hidden.";
            }

            // 1. Uncheck LOD Data filter if it was active
            const lodCheckbox = document.getElementById('lodData');
            if (lodCheckbox && lodCheckbox.checked) {
                lodCheckbox.checked = false;
                const label = lodCheckbox.closest('label');
                if (label) label.classList.remove('active');
            }

            // 2. Activate Google Photorealistic via Basemap Control
            this.setBaseMap('google-photorealistic');

            // 3. Show Google Photorealistic filter and ensure others are visible but inactive
            const filterLabels = document.querySelectorAll('#optionsBox .filter-group label');
            filterLabels.forEach(label => {
                label.style.display = 'flex'; // Always visible
                const input = label.querySelector('input');

                if (label.id === 'googleFilterLabel' || label.getAttribute('data-filter') === 'googlePhotorealistic') {
                    if (input) input.checked = true;
                    label.classList.add('active');
                } else {
                    // Marker radios or other checkboxes
                    // We don't necessarily want to "turn off" the radio selection, 
                    // but we ensure LOD is off and others are not "active highlight" unless they are the selection.
                    if (input && input.type === 'checkbox' && input.id === 'lodData') {
                        input.checked = false;
                        label.classList.remove('active');
                    }
                }
            });

            // 4. Zoom to Cologne Cathedral from 500m South-West
            this.flyToLocation(6.9523, 50.9373, 500, 45, -30);

            return "Google Photorealistic 3D activated. All filters are visible, but LOD is deactivated.";
        }
        return "I can control OSM, aerial, aerial with labels, Google 3D, OSM buildings, and LoD2 buildings.";
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
        const normalizedText = this.normalizeSearchText(text);

        if (normalizedText.includes('viewer 3d') || normalizedText.includes('3d models in this viewer')) {
            this.triggerFilter('viewer3d');
            return "Showing only 3D models in this viewer.";
        }
        if (normalizedText.includes('models') || normalizedText.includes('3d')) {
            this.triggerFilter('3dmodel');
            return "Showing only 3D Models.";
        }
        if (normalizedText.includes('photos') || normalizedText.includes('photo')) {
            this.triggerFilter('photo');
            return "Showing only Photos.";
        }
        if (normalizedText.includes('wikipedia') || normalizedText.includes('wiki')) {
            this.triggerFilter('wikipedia');
            return "Showing only monuments with Wikipedia articles.";
        }
        if (normalizedText.includes('openstreetmap') || normalizedText.includes('osm records')) {
            this.triggerFilter('filter_openstreetmap');
            return "Showing only monuments with OpenStreetMap records.";
        }
        if (normalizedText.includes('all')) {
            // Ensure all filters are visible and reset google filter if needed
            const filterLabels = document.querySelectorAll('#optionsBox .filter-group label');
            filterLabels.forEach(label => {
                label.style.display = 'flex';
                if (label.id === 'googleFilterLabel') {
                    const cb = label.querySelector('input');
                    if (cb) cb.checked = false;
                    label.classList.remove('active');
                }
            });
            this.triggerFilter('allMarkers');
            return "Showing all markers and resetting filter list.";
        }
        return "I can filter by viewer 3D, models, photos, Wikipedia, OpenStreetMap records, or all.";
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
