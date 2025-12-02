// Globale tellers
let groupCount = 0;
let fieldCount = 0;

// --- 0. HULPFUNCTIE: Aangepaste Meldingen (vervangt alert() en confirm()) ---

/**
 * Toont een tijdelijke, aangepaste melding (toast).
 * @param {string} message - De te tonen tekst.
 * @param {('success'|'error'|'warning')} type - Het type melding (bepaalt de kleur).
 */
// API Configuratie: Automatisch detecteren van omgeving (localhost vs productie)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}/api`;


function showMessage(message, type) {
    const container = document.getElementById('message-container') || createMessageContainer();

    // Bepaal de kleuren op basis van het type
    let bgColor, borderColor;
    if (type === 'success') {
        bgColor = 'bg-green-500';
        borderColor = 'border-green-700';
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        borderColor = 'border-red-700';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-500';
        borderColor = 'border-yellow-700';
    } else {
        bgColor = 'bg-gray-500';
        borderColor = 'border-gray-700';
    }

    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 z-50 p-4 text-white font-semibold rounded-lg shadow-xl 
                       ${bgColor} border-b-4 ${borderColor} transition-transform transform duration-300`;
    toast.style.transform = 'translateX(100%)'; // Begin buiten beeld
    toast.textContent = message;

    container.appendChild(toast);

    // Fade in en schuif naar binnen
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Verwijder na 5 seconden
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)'; // Schuif naar buiten
        toast.addEventListener('transitionend', () => toast.remove()); // Verwijder na animatie
    }, 5000);
}

/**
 * Maakt de container voor alle meldingen als deze nog niet bestaat.
 */
function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'fixed top-0 right-0 p-4 space-y-2 z-50';
    document.body.appendChild(container);
    return container;
}


// --- 1. FUNCTIONALITEIT: DATA OPHALEN EN WEERGEVEN ---

/**
 * Laadt data van de server, inclusief ontsleutelde wachtwoorden, en toont de formuliergroepen.
 */
async function loadDataAndRender() {
    const formContainer = document.getElementById('mvp-form');
    if (!formContainer) return;

    // Leeg de container bij het laden om duplicaten te voorkomen
    formContainer.innerHTML = '';
    groupCount = 0;
    fieldCount = 0;

    try {
        const response = await fetch(`${API_BASE_URL}/getData`);
        if (!response.ok) {
            throw new Error('Kon data niet ophalen van de server.');
        }
        const data = await response.json();

        let highestGroupId = 0;

        // Toon elke opgeslagen groep
        data.forEach(item => {
            if (item.GroupId > highestGroupId) {
                highestGroupId = item.GroupId;
            }

            // De ontsleutelde Password-waarde wordt nu meegegeven
            const groupHtml = createGroupHTML(
                item.GroupId,
                item.Username,
                item.Password,
                item.Domain
            );
            formContainer.insertAdjacentHTML('beforeend', groupHtml);
        });

        // Stel de globale teller in op de hoogste GroupId + 1 voor de volgende nieuwe groep
        groupCount = highestGroupId;

        if (data.length === 0) {
            // Als er geen data is, toon dan de eerste lege groep
            addNewGroup();
        }

    } catch (error) {
        console.error("Fout bij het laden van opgeslagen data:", error);
        showMessage(`❌ Fout bij het laden van data: ${error.message}. Wordt vervangen door een nieuwe groep.`, 'error');
        if (formContainer.innerHTML === '') {
            addNewGroup();
        }
    }
}


// --- 2. HULPFUNCTIE: HTML voor nieuwe groep aanmaken ---

/**
 * Maakt en retourneert de HTML-string voor een nieuwe veldengroep.
 */
function createGroupHTML(id, usernameValue = "", passwordValue = "", domainValue = "") {
    // We gebruiken nu het GroupId als basis voor unieke veldnamen
    const usernameName = `username_${id}`;
    const passwordName = `password_${id}`;
    const domainName = `domain_${id}`;

    const labelClasses = "block text-sm font-medium text-gray-700 mb-1"; // Stijl voor labels
    const inputClasses = "w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const saveButtonClasses = "px-3 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150";
    const updateButtonClasses = "px-3 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition duration-150";
    const deleteButtonClasses = "px-3 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-150";

    return `
        <div class="field-group mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50" id="group-${id}">

            <div class="input-container grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" id="input-container-${id}">
                <div class="input-box">
                    <label for="${usernameName}" class="${labelClasses}">Gebruikersnaam</label>
                    <input type="text" id="${usernameName}" name="${usernameName}" placeholder="Gebruikersnaam" 
                            value="${usernameValue}" class="${inputClasses}">
                </div>
                <div class="input-box">
                    <label for="${passwordName}" class="${labelClasses}">Wachtwoord</label>
                    <!-- Type is 'text' om de ontsleutelde waarde zichtbaar te maken -->
                    <input type="text" id="${passwordName}" name="${passwordName}" placeholder="Wachtwoord" 
                            value="${passwordValue}" class="${inputClasses}">
                </div>
                <div class="input-box">
                    <label for="${domainName}" class="${labelClasses}">Domein</label>
                    <input type="text" id="${domainName}" name="${domainName}" placeholder="Domein" 
                            value="${domainValue}" class="${inputClasses}">
                </div>
            </div>
            
            <div class="group-controls flex space-x-2 mt-3" id="group-controls-${id}">
                <button type="button" 
                        onclick="saveDataToServer(${id}, '${usernameName}', '${passwordName}', '${domainName}')"
                        class="${saveButtonClasses}">
                     Opslaan
                </button>

                <button type="button" 
                        onclick="updateDataToServer(${id}, '${usernameName}', '${passwordName}', '${domainName}')"
                        class="${updateButtonClasses}">
                     Bijwerken 
                </button>
                
                <button type="button" 
                        onclick="removeGroupContent(${id})"
                        class="${deleteButtonClasses}">
                     Verwijderen
                </button>
            </div>
        </div>
    `;
}

// --- 3. FUNCTIONALITEIT: Nieuwe Groep Toevoegen ---
function addNewGroup() {
    groupCount++;
    const form = document.getElementById('mvp-form');
    // Zorg ervoor dat de ID van de nieuwe groep hoger is dan de laatst geladen ID,
    // ongeacht of de database leeg was of niet.
    const newId = groupCount;
    const newGroupHtml = createGroupHTML(newId);
    form.insertAdjacentHTML('beforeend', newGroupHtml);
    // Werk de groupCount bij zodat de volgende nieuwe groep een unieke ID krijgt
    groupCount = newId;

}

// --- 4. FUNCTIONALITEIT: DATA OPSLAAN (POST - INSERT) ---

/**
 * Stuurt de data van een specifieke groep via POST naar de Node.js server (INSERT).
 */
function saveDataToServer(id, userFieldName, passFieldName, domainFieldName) {
    const groupContainer = document.getElementById(`input-container-${id}`);

    if (!groupContainer) {
        showMessage("Kan groep niet vinden om op te slaan.", 'error');
        return;
    }

    const userData = {
        GroupId: id,
        Username: groupContainer.querySelector(`input[name="${userFieldName}"]`).value,
        Password: groupContainer.querySelector(`input[name="${passFieldName}"]`).value, // Wordt versleuteld op de server
        Domain: groupContainer.querySelector(`input[name="${domainFieldName}"]`).value
    };

    if (!userData.Username || !userData.Password || !userData.Domain) {
        showMessage("Vul alle velden in voordat je opslaat. Wachtwoord is verplicht voor INSERT.", 'warning');
        return;
    }

    fetch(`${API_BASE_URL}/saveData`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    })
        .then(response => {
            if (response.ok) {
                showMessage('✓ Data succesvol opgeslagen!', 'success');
                loadDataAndRender();
            } else {
                // Verbeterde foutafhandeling voor niet-JSON antwoorden
                return response.json()
                    .then(err => {
                        // Gooi de foutmelding uit de JSON-body, of een algemene foutmelding als de body leeg is
                        throw new Error(err.message || `Onbekende serverfout (${response.status}) bij Opslaan.`);
                    })
                    .catch(() => {
                        // Als de JSON-parsing mislukt (bijvoorbeeld bij een HTML-foutpagina), geef een algemene foutmelding
                        throw new Error(`Serverfout: Kon response niet verwerken (Status: ${response.status}). Controleer of de Node.js server draait.`);
                    });
            }
        })
        .catch(error => {
            // Vereenvoudigde, robuustere foutmelding
            showMessage(`❌ Fout bij opslaan: ${error.message}`, 'error');
            console.error('Opslagfout:', error);
        });
}

// --- 5. FUNCTIONALITEIT: DATA BIJWERKEN (PUT - UPDATE) ---

/**
 * Stuurt de data van een specifieke groep via PUT naar de Node.js server (UPDATE).
 */
function updateDataToServer(id, userFieldName, passFieldName, domainFieldName) {
    const groupContainer = document.getElementById(`input-container-${id}`);

    if (!groupContainer) {
        showMessage("Kan niet bijwerken.", 'error');
        return;
    }

    const userData = {
        Username: groupContainer.querySelector(`input[name="${userFieldName}"]`).value,
        Password: groupContainer.querySelector(`input[name="${passFieldName}"]`).value, // Wordt versleuteld op de server als het niet leeg is
        Domain: groupContainer.querySelector(`input[name="${domainFieldName}"]`).value
    };

    if (!userData.Username || !userData.Domain) {
        showMessage("Gebruikersnaam en Domein zijn verplicht voor bijwerken.", 'warning');
        return;
    }

    fetch(`${API_BASE_URL}/data/${id}`, {
        method: 'PUT', // PUT voor UPDATE
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
        .then(response => {
            if (response.ok) {
                const passwordStatus = userData.Password.trim() === '' ? 'ongewijzigd' : 'opnieuw versleuteld';
                showMessage(`✓ Data succesvol bijgewerkt (UPDATE). Wachtwoord is ${passwordStatus}.`, 'success');
                loadDataAndRender();
            } else {
                // Verbeterde foutafhandeling voor niet-JSON antwoorden
                return response.json()
                    .then(err => {
                        // Gooi de foutmelding uit de JSON-body, of een algemene foutmelding als de body leeg is
                        throw new Error(err.message || `Onbekende serverfout (${response.status}) bij Bijwerken.`);
                    })
                    .catch(() => {
                        // Als de JSON-parsing mislukt (bijvoorbeeld bij een HTML-foutpagina), geef een algemene foutmelding
                        throw new Error(`Serverfout: Kon response niet verwerken (Status: ${response.status}). Controleer of de Node.js server draait.`);
                    });
            }
        })
        .catch(error => {
            // Vereenvoudigde, robuustere foutmelding
            showMessage(`❌ Fout bij bijwerken. Details: ${error.message}`, 'error');
            console.error('Bijwerkfout:', error);
        });
}

// --- 6. FUNCTIONALITEIT: DATA VERWIJDEREN (DELETE) ---

/**
 * Stuurt een DELETE verzoek naar de Node.js server.
 */
function deleteDataFromServer(groupId) {
    return fetch(`${API_BASE_URL}/data/${groupId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 404) {
                throw new Error("Record niet gevonden in database. Wordt alleen lokaal verwijderd.");
            }
            if (!response.ok) {
                throw new Error(`Serverfout: status ${response.status}`);
            }
            return response.text();
        });
}

/**
 * Verwijdert data van de server EN de elementen uit de DOM.
 */
function removeGroupContent(id) {
    deleteDataFromServer(id)
        .then(() => {
            const groupDiv = document.getElementById(`group-${id}`);
            if (groupDiv) {
                groupDiv.remove();
            }
            showMessage(`✓ Data succesvol verwijderd uit database en scherm.`, 'success');
            loadDataAndRender();
        })
        .catch(error => {
            if (error.message.includes("Record niet gevonden")) {
                const groupDiv = document.getElementById(`group-${id}`);
                if (groupDiv) {
                    groupDiv.remove();
                }
                showMessage(`⚠️ Data stond niet in de database, maar veld is verwijderd.`, 'warning');
            } else {
                showMessage(`❌ Fout bij verwijderen: ${error.message}. Controleer Node.js server.`, 'error');
                console.error(error);
            }
            loadDataAndRender();
        });
}

// De initiële laadfunctie wordt uitgevoerd bij het laden van het script.
loadDataAndRender();
