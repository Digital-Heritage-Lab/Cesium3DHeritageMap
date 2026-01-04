document.addEventListener('DOMContentLoaded', () => {
    const localJsonUrl = '../Apps/Data/denkmaeler.json';
    const remoteJsonUrl = 'https://opendem.info/cgi-bin/getDenkmal.py';
    let data = [];
    const sortOrder = {
        denkmallistennummer: 'asc',
        baujahr: 'asc',
        unterschutzstellung: 'asc'
    };

    const resultsTableBody = document.querySelector('#results-table tbody');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoryFilter = document.getElementById('category-filter');
    let searchTimer = null;
    const WIKI_CONCURRENCY = 4; // Maximum concurrent Wikipedia API requests
    const SEARCH_DEBOUNCE_MS = 200; // Debounce delay for search input
    const WIKI_THUMB_SIZE = 360; // Wikipedia thumbnail size in pixels

    const wikiThumbCache = new Map();
    const wikiInFlight = new Map();
    const wikiQueue = [];
    let wikiActive = 0;

    resultsTableBody.addEventListener('click', (event) => {
        const thumbnail = event.target.closest('.thumbnail');
        if (thumbnail) {
            openModalWithImage(thumbnail.src);
            return;
        }

        const mapLink = event.target.closest('.map-link');
        if (mapLink) {
            event.preventDefault();
            openModalWithMap(mapLink.dataset.lat, mapLink.dataset.lon);
        }
    });

    resultsTableBody.addEventListener('error', (event) => {
        const img = event.target;
        if (img && img.classList && img.classList.contains('thumbnail')) {
            const wikiUrl = img.dataset.wikiUrl || '';
            if (wikiUrl && img.dataset.wikiTried !== '1') {
                img.dataset.wikiTried = '1';
                const cell = img.closest('td');
                if (cell) {
                    setPhotoCellLoading(cell);
                    enqueueWikiThumbnail(cell, wikiUrl);
                    return;
                }
            }
            const fallback = document.createElement('span');
            fallback.className = 'no-photo';
            fallback.textContent = 'No photo';
            img.replaceWith(fallback);
        }
    }, true);

    const fetchJson = (url) => {
        return fetch(url).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
    };

    fetchJson(localJsonUrl)
        .catch(error => {
            console.warn('Local data failed, trying remote source.', error);
            return fetchJson(remoteJsonUrl);
        })
        .then(json => {
            data = json.features || [];
            data.sort((a, b) => sortByDenkmallistennummer(a, b, 'asc'));
            populateCategories(data);
            applyFilters();
        })
        .catch(error => {
            console.error('Failed to load data:', error);
        });

    searchButton.addEventListener('click', () => {
        applyFilters();
    });

    searchInput.addEventListener('input', () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(() => {
            applyFilters();
        }, SEARCH_DEBOUNCE_MS);
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyFilters();
        }
    });

    categoryFilter.addEventListener('change', () => {
        applyFilters();
    });

    document.getElementById('th-denkmallistennummer').addEventListener('click', () => {
        sortData('denkmallistennummer');
    });

    document.getElementById('th-baujahr').addEventListener('click', () => {
        sortData('baujahr');
    });

    document.getElementById('th-unterschutzstellung').addEventListener('click', () => {
        sortData('unterschutzstellung');
    });

    function sortData(key) {
        const order = sortOrder[key];
        if (key === 'denkmallistennummer') {
            data.sort((a, b) => sortByDenkmallistennummer(a, b, order));
        } else {
            data.sort((a, b) => {
                const aValue = a.properties[key] || 'N/A';
                const bValue = b.properties[key] || 'N/A';
                if (aValue === 'N/A') return 1;
                if (bValue === 'N/A') return -1;
                if (order === 'asc') {
                    return aValue.localeCompare(bValue);
                }
                return bValue.localeCompare(aValue);
            });
        }
        sortOrder[key] = order === 'asc' ? 'desc' : 'asc';
        clearSortIndicators();
        document.getElementById(`th-${key}`).innerHTML = getColumnHeader(key, order);
        applyFilters();
    }

    function sortByDenkmallistennummer(a, b, order) {
        const aValue = a.properties.denkmallistennummer || 'N/A';
        const bValue = b.properties.denkmallistennummer || 'N/A';
        if (aValue === 'N/A') return 1;
        if (bValue === 'N/A') return -1;
        if (order === 'asc') {
            return aValue.localeCompare(bValue);
        }
        return bValue.localeCompare(aValue);
    }

    function clearSortIndicators() {
        document.getElementById('th-denkmallistennummer').innerHTML = 'Memorial List Number';
        document.getElementById('th-baujahr').innerHTML = 'Year of Construction';
        document.getElementById('th-unterschutzstellung').innerHTML = 'Protection Date';
    }

    function getColumnHeader(key, order) {
        const headers = {
            denkmallistennummer: 'Memorial List Number',
            baujahr: 'Year of Construction',
            unterschutzstellung: 'Protection Date'
        };
        const arrow = order === 'asc' ? '&#9650;' : '&#9660;';
        return `${headers[key]} ${arrow}`;
    }

    function populateCategories(items) {
        const categories = [...new Set(items.map(item => item.properties.kategorie).filter(Boolean))];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    function normalizeUrl(value) {
        if (!value || typeof value !== 'string') {
            return '';
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }
        const fixed = fixMojibake(trimmed);
        if (fixed.startsWith('//')) {
            return `https:${fixed}`;
        }
        try {
            return encodeURI(fixed);
        } catch (error) {
            return fixed;
        }
    }

    function fixMojibake(value) {
        if (!value) {
            return value;
        }
        if (typeof TextDecoder === 'undefined') {
            return value;
        }
        let bytes;
        try {
            bytes = Uint8Array.from(value, char => char.charCodeAt(0));
        } catch (error) {
            return value;
        }
        let decoded = value;
        try {
            decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        } catch (error) {
            return value;
        }
        if (!decoded || decoded.includes('\uFFFD') || decoded === value) {
            return value;
        }
        return decoded;
    }

    function parseWikiUrl(wikiUrl) {
        if (!wikiUrl) {
            return null;
        }
        try {
            const url = new URL(wikiUrl);
            if (!url.hostname.includes('wikipedia.org')) {
                return null;
            }
            let title = url.pathname;
            if (title.startsWith('/wiki/')) {
                title = title.slice(6);
            } else {
                const parts = title.split('/');
                title = parts[parts.length - 1] || '';
            }
            if (!title) {
                return null;
            }
            try {
                title = decodeURIComponent(title);
            } catch (error) {
                // Keep encoded title if decoding fails.
            }
            return { origin: url.origin, title };
        } catch (error) {
            return null;
        }
    }

    function resolveWikiThumbnail(wikiUrl) {
        if (wikiThumbCache.has(wikiUrl)) {
            return Promise.resolve(wikiThumbCache.get(wikiUrl));
        }
        if (wikiInFlight.has(wikiUrl)) {
            return wikiInFlight.get(wikiUrl);
        }
        const parsed = parseWikiUrl(wikiUrl);
        if (!parsed) {
            wikiThumbCache.set(wikiUrl, '');
            return Promise.resolve('');
        }
        const apiUrl = `${parsed.origin}/w/api.php?origin=*&action=query&prop=pageimages&piprop=thumbnail&pithumbsize=${WIKI_THUMB_SIZE}&format=json&titles=${encodeURIComponent(parsed.title)}`;
        const request = fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Wiki HTTP error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const pages = data.query && data.query.pages ? data.query.pages : {};
                const page = pages[Object.keys(pages)[0]];
                const src = page && page.thumbnail ? page.thumbnail.source : '';
                wikiThumbCache.set(wikiUrl, src || '');
                return src || '';
            })
            .catch(error => {
                console.warn('Failed to load Wikipedia thumbnail.', error);
                wikiThumbCache.set(wikiUrl, '');
                return '';
            })
            .finally(() => {
                wikiInFlight.delete(wikiUrl);
            });
        wikiInFlight.set(wikiUrl, request);
        return request;
    }

    function enqueueWikiThumbnail(cell, wikiUrl) {
        if (!cell || !wikiUrl || cell.dataset.wikiQueued === '1') {
            return;
        }
        cell.dataset.wikiQueued = '1';
        wikiQueue.push({ cell, wikiUrl });
        processWikiQueue();
    }

    function processWikiQueue() {
        while (wikiActive < WIKI_CONCURRENCY && wikiQueue.length) {
            const task = wikiQueue.shift();
            wikiActive += 1;
            resolveWikiThumbnail(task.wikiUrl)
                .then(src => {
                    if (!document.body.contains(task.cell)) {
                        return;
                    }
                    if (!src) {
                        task.cell.innerHTML = '<span class="no-photo">No photo</span>';
                        return;
                    }
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = 'Monument photo';
                    img.className = 'thumbnail';
                    task.cell.innerHTML = '';
                    task.cell.appendChild(img);
                })
                .finally(() => {
                    wikiActive -= 1;
                    processWikiQueue();
                });
        }
    }

    function setPhotoCellLoading(cell) {
        if (!cell) {
            return;
        }
        cell.innerHTML = '<span class="no-photo">Loading...</span>';
    }

    function hasPhoto(item) {
        const flag = (item.properties.foto || '').toString().trim().toLowerCase();
        return flag === 'ja';
    }

    function getFilteredData() {
        const searchValue = searchInput.value.trim().toLowerCase();
        const category = categoryFilter.value;
        return data.filter(item => {
            const matchesCategory = category ? item.properties.kategorie === category : true;
            const matchesSearch = searchValue
                ? (item.properties.denkmallistennummer || '').toLowerCase().includes(searchValue)
                || (item.properties.kurzbezeichnung || '').toLowerCase().includes(searchValue)
                : true;
            return matchesCategory && matchesSearch;
        });
    }

    function applyFilters() {
        displayResults(getFilteredData());
    }

    /**
     * Displays the filtered monument data in the results table.
     * @param {Array} items - Array of monument features to display
     */
    function displayResults(items) {
        resultsTableBody.innerHTML = '';
        if (!items.length) {
            resultsTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No results found.</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const coordinates = item.geometry ? item.geometry.coordinates : null;
            const lat = coordinates ? coordinates[1] : null;
            const lon = coordinates ? coordinates[0] : null;
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
            const mapLink = hasCoords
                ? `<a href="#" class="map-link" data-lat="${lat}" data-lon="${lon}">Map</a>`
                : 'N/A';
            const wikiUrl = normalizeUrl(item.properties.wikiurl);
            const photoUrl = hasPhoto(item) ? normalizeUrl(item.properties.fotourl) : '';
            let photoCell = '<span class="no-photo">No photo</span>';
            if (photoUrl) {
                const wikiAttr = wikiUrl ? ` data-wiki-url="${wikiUrl}"` : '';
                photoCell = `<img src="${photoUrl}" alt="Monument photo" class="thumbnail" loading="lazy" decoding="async"${wikiAttr}>`;
            } else if (wikiUrl) {
                photoCell = '<span class="no-photo">Loading...</span>';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Memorial List Number">${item.properties.denkmallistennummer || 'N/A'}</td>
                <td data-label="Photo" class="photo-cell">${photoCell}</td>
                <td data-label="Brief Description">${item.properties.kurzbezeichnung || 'N/A'}</td>
                <td data-label="Category">${item.properties.kategorie || 'N/A'}</td>
                <td data-label="Year of Construction">${item.properties.baujahr || 'N/A'}</td>
                <td data-label="Protection Date">${item.properties.unterschutzstellung || 'N/A'}</td>
                <td data-label="Map Location">${mapLink}</td>
                <td data-label="3D Model">${item.properties.model3durl ? `<a href="${normalizeUrl(item.properties.model3durl)}" target="_blank" rel="noopener noreferrer">3D Model</a>` : 'N/A'}</td>
                <td data-label="Wiki">${item.properties.wikiurl ? `<a href="${normalizeUrl(item.properties.wikiurl)}" target="_blank" rel="noopener noreferrer">Wiki</a>` : 'N/A'}</td>
            `;

            fragment.appendChild(row);

            if (!photoUrl && wikiUrl) {
                const photoCellElement = row.querySelector('.photo-cell');
                enqueueWikiThumbnail(photoCellElement, wikiUrl);
            }
        });
        resultsTableBody.appendChild(fragment);
    }

    function openModalWithImage(src) {
        modalContent.innerHTML = `<img src="${src}" alt="Monument photo" style="width: 100%;">`;
        openModal();
    }

    function openModalWithMap(lat, lon) {
        modalContent.innerHTML = `<iframe src="https://www.google.com/maps?q=${lat},${lon}&output=embed" width="100%" height="450" frameborder="0" style="border:0;" loading="lazy"></iframe>`;
        openModal();
    }

    function openModal() {
        modal.style.display = 'block';
    }

    const modalClose = document.querySelector('.modal .close');
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
