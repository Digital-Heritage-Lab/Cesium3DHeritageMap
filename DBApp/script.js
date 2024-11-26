document.addEventListener('DOMContentLoaded', () => {
    const jsonUrl = 'https://opendem.info/cgi-bin/getDenkmal.py'; // JSON dosyanızın URL'sini buraya ekleyin
    let data = [];
    let sortOrder = {
        denkmallistennummer: 'asc',
        baujahr: 'asc',
        unterschutzstellung: 'asc'
    };

    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(json => {
            data = json.features;
            // İlk başta "denkmallistennummer" değerine göre sıralama
            data.sort((a, b) => sortByDenkmallistennummer(a, b, 'asc'));
            populateCategories(data);
            displayResults(data);
        })
        .catch(error => {
            console.error('Veri alınırken bir hata oluştu:', error);
        });

    document.getElementById('search-button').addEventListener('click', () => {
        const searchInput = document.getElementById('search-input').value.toLowerCase();
        const filteredData = data.filter(item => 
            (item.properties.denkmallistennummer || '').toLowerCase().includes(searchInput) ||
            (item.properties.kurzbezeichnung || '').toLowerCase().includes(searchInput)
        );
        displayResults(filteredData);
    });

    document.getElementById('category-filter').addEventListener('change', (event) => {
        const category = event.target.value;
        const filteredData = category ? data.filter(item => item.properties.kategorie === category) : data;
        displayResults(filteredData);
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
                } else {
                    return bValue.localeCompare(aValue);
                }
            });
        }
        sortOrder[key] = order === 'asc' ? 'desc' : 'asc';
        clearSortIndicators();
        document.getElementById(`th-${key}`).innerHTML = getColumnHeader(key, order);
        displayResults(data);
    }

    function sortByDenkmallistennummer(a, b, order) {
        const aValue = a.properties.denkmallistennummer || 'N/A';
        const bValue = b.properties.denkmallistennummer || 'N/A';
        if (aValue === 'N/A') return 1;
        if (bValue === 'N/A') return -1;
        if (order === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    }

    function clearSortIndicators() {
        document.getElementById('th-denkmallistennummer').innerHTML = 'Nummer der Denkmalliste';
        document.getElementById('th-baujahr').innerHTML = 'Baujahr';
        document.getElementById('th-unterschutzstellung').innerHTML = 'Unterschutzstellung';
    }

    function getColumnHeader(key, order) {
        const headers = {
            denkmallistennummer: 'Nummer der Denkmallist',
            baujahr: 'Baujahr',
            unterschutzstellung: 'Unterschutzstellung'
        };
        const arrow = order === 'asc' ? '&#9650;' : '&#9660;'; // Unicode oklar: yukarı ok ve aşağı ok
        return `${headers[key]} ${arrow}`;
    }

    function populateCategories(data) {
        const categories = [...new Set(data.map(item => item.properties.kategorie).filter(Boolean))];
        const categoryFilter = document.getElementById('category-filter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    function displayResults(data) {
        const resultsTableBody = document.querySelector('#results-table tbody');
        resultsTableBody.innerHTML = '';
        data.forEach(item => {
            const coordinates = item.geometry.coordinates;
            const lat = coordinates ? coordinates[1] : null;
            const lon = coordinates ? coordinates[0] : null;
            const mapLink = lat && lon ? `<a href="#" class="map-link" data-lat="${lat}" data-lon="${lon}">Karte Standort</a>` : 'N/A';
            
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${item.properties.denkmallistennummer || 'N/A'}</td>
                <td>${item.properties.foto ? `<img src="${item.properties.fotourl}" alt="Denkmal-Foto" class="thumbnail">` : 'Kein Foto'}</td>
                <td>${item.properties.kurzbezeichnung || 'N/A'}</td>
                <td>${item.properties.kategorie || 'N/A'}</td>
                <td>${item.properties.baujahr || 'N/A'}</td>
                <td>${item.properties.unterschutzstellung || 'N/A'}</td>
                <td>${mapLink}</td>
                <td>${item.properties.model3durl ? `<a href="${item.properties.model3durl}" target="_blank">3D Model</a>` : 'N/A'}</td>
                <td>${item.properties.wikiurl ? `<a href="${item.properties.wikiurl}" target="_blank">Wiki</a>` : 'N/A'}</td>
            `;

            resultsTableBody.appendChild(row);
        });

        // Add event listeners for the modal functionality
        document.querySelectorAll('.thumbnail').forEach(img => {
            img.addEventListener('click', openModalWithImage);
        });

        document.querySelectorAll('.map-link').forEach(link => {
            link.addEventListener('click', openModalWithMap);
        });
    }

    function openModalWithImage(event) {
        const src = event.target.src;
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = `<img src="${src}" alt="Denkmal-Foto" style="width: 100%;">`;
        openModal();
    }

    function openModalWithMap(event) {
        const lat = event.target.dataset.lat;
        const lon = event.target.dataset.lon;
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = `<iframe src="https://www.google.com/maps?q=${lat},${lon}&output=embed" width="100%" height="450" frameborder="0" style="border:0;"></iframe>`;
        openModal();
    }

    function openModal() {
        const modal = document.getElementById('modal');
        modal.style.display = "block";
    }

    const modalClose = document.querySelector('.modal .close');
    modalClose.addEventListener('click', () => {
        const modal = document.getElementById('modal');
        modal.style.display = "none";
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});
