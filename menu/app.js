// --- Global State ---
let currentSchedule = [];
let currentSeed = null;
let currentOverrides = {};
let dbRef = null; // Reference to our Firebase database "channel" for overrides
let presenceRef = null; // Reference to our presence channel
let currentUser = null;

// --- Master Lists for URL Shortening ---
const allCategories = Object.keys(CONFIG.meal_options).sort();
const allMains = [...new Set(Object.values(CONFIG.meal_options).flatMap(cat => cat.main))].sort();
const allSideDishes = (() => {
    const sides = new Set();
    Object.values(CONFIG.meal_options).forEach(cat => {
        const sideSource = cat.sides;
        if (Array.isArray(sideSource)) {
            sideSource.forEach(s => sides.add(s));
        } else if (typeof sideSource === 'string') {
            sides.add(sideSource);
        } else if (typeof sideSource === 'object') {
            Object.values(sideSource).flat().forEach(s => sides.add(s));
        }
    });
    return [...sides].sort();
})();

// --- Firebase Login and Real-time Logic ---
auth.onAuthStateChanged(user => {
    const loginScreen = document.getElementById('login-screen');
    const mainContainer = document.querySelector('.container');

    if (user) {
        // User is signed in.
        currentUser = user;
        loginScreen.style.display = 'none';
        mainContainer.style.display = 'block';
        initializeApp();
    } else {
        // User is signed out.
        currentUser = null;
        loginScreen.style.display = 'block';
        mainContainer.style.display = 'none';
        if (dbRef) dbRef.off(); 
        if (presenceRef) presenceRef.off();
    }
});

document.getElementById('login-btn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
});

// --- Main App Initialization (runs after login) ---
function initializeApp() {
    // Attach event listeners for the main app
    document.getElementById('generate-btn').addEventListener('click', () => {
        currentOverrides = {};
        generateAndRender();
        publishOverrides();
    });
    document.getElementById('print-btn').addEventListener('click', handlePrintClick);
    document.getElementById('saved-plans').addEventListener('change', handleSavedPlanChange);
    document.getElementById('save-changes-btn').addEventListener('click', handleSaveChangesClick);
    document.getElementById('share-btn').addEventListener('click', handleShareClick);
    document.getElementById('stop-sharing-btn').addEventListener('click', handleStopSharingClick);
    document.querySelector('.modal-close-btn').addEventListener('click', () => document.getElementById('replace-modal').classList.remove('visible'));
    document.getElementById('replace-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) document.getElementById('replace-modal').classList.remove('visible');
    });

    renderSavedPlans();
    const urlParams = new URLSearchParams(window.location.search);
    const seed = urlParams.get('seed');
    const overrides = urlParams.get('overrides');
    
    if (seed) {
        initializePlanFromUrl(parseInt(seed), overrides);
    }
}

// --- Real-time and Presence Functions ---
function setupFirebaseListener() {
    // Detach old listeners
    if (dbRef) dbRef.off();
    if (presenceRef) {
        presenceRef.child(currentUser.uid).remove(); // Remove self from old presence list
        presenceRef.off();
    }
    if (!currentSeed) return;

    const channel = `plans/${currentSeed}`;
    dbRef = db.ref(channel);
    presenceRef = db.ref(`presence/${currentSeed}`);
    
    // Listen for remote changes to overrides
    dbRef.on('value', (snapshot) => {
        const remoteOverridesStr = snapshot.val() || "";
        const localOverridesStr = serializeOverrides(currentOverrides);

        if (remoteOverridesStr !== localOverridesStr) {
            console.log("Remote change detected, updating UI.");
            currentOverrides = parseOverrides(remoteOverridesStr);
            applyOverrides();
            renderSchedule(currentSchedule);
            recalculateAndRenderShoppingList();
            updateUrl();
        }
    });

    // Handle user presence
    const userRef = presenceRef.child(currentUser.uid);
    userRef.set({
        name: currentUser.displayName,
        photoURL: currentUser.photoURL
    });
    userRef.onDisconnect().remove(); // Automatically remove on disconnect

    // Listen for changes in presence list and render avatars
    presenceRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const container = document.getElementById('presence-indicators');
        container.innerHTML = '';
        Object.values(users).forEach(user => {
            const img = document.createElement('img');
            img.src = user.photoURL;
            img.className = 'user-avatar';
            img.title = user.name;
            container.appendChild(img);
        });
    });
}

function publishOverrides() {
    if (dbRef) {
        const overrideStr = serializeOverrides(currentOverrides);
        dbRef.set(overrideStr);
    }
}

function handleShareClick() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Plan URL copied to clipboard!');
    }, () => {
        alert('Failed to copy URL. Please copy it from the address bar.');
    });
}

function handleStopSharingClick() {
    if (confirm("Are you sure you want to stop sharing? This will clear the session for all current viewers.")) {
        if (presenceRef) presenceRef.remove();
        if (dbRef) dbRef.remove();
    }
}


// --- Helper Functions for State Management ---
// [ The functions parseOverrides, serializeOverrides, applyOverrides, updateUrl remain unchanged ]
// [ All other functions like generateAndRender, renderSchedule, confirmReplacement, etc., also remain largely unchanged, but with one key addition: ]
// [ They must now call publishOverrides() after making a change. ]
function serializeOverrides(overridesObj) {
    return Object.entries(overridesObj).map(([index, data]) => {
        const mainIndex = allMains.indexOf(data.MainDish);
        const categoryIndex = allCategories.indexOf(data.Category);
        
        const baseSideDish = data.SideDish.split(' (+ ')[0];
        const prepTask = data.SideDish.includes(' (+ Prep:') ? data.SideDish.split(' (+ Prep: ')[1].replace(')', '') : null;
        
        const sideDishIndex = allSideDishes.indexOf(baseSideDish);
        const prepTaskIndex = prepTask ? CONFIG.prep_tasks.indexOf(prepTask) : -1;

        return `${index},${mainIndex},${categoryIndex},${sideDishIndex},${prepTaskIndex}`;
    }).join('|');
}

function parseOverrides(overridesStr) {
    const overrides = {};
    if (!overridesStr) return overrides;
    overridesStr.split('|').forEach(part => {
        if (!part) return;
        const fields = part.split(',');
        const index = parseInt(fields[0]);

        const mainDish = allMains[parseInt(fields[1])];
        const category = allCategories[parseInt(fields[2])];
        let finalSideDish;

        if (fields.length === 5) { // New 5-part format with prep task
            let baseSideDish = allSideDishes[parseInt(fields[3])] || ""; 
            const prepTaskIndex = parseInt(fields[4]);
            finalSideDish = baseSideDish;
            if (prepTaskIndex > -1) {
                const prepTask = CONFIG.prep_tasks[prepTaskIndex];
                if (prepTask) {
                   finalSideDish = `${baseSideDish} (+ Prep: ${prepTask})`;
                }
            }
        } else { // Legacy 4-part format
            finalSideDish = allSideDishes[parseInt(fields[3])] || "";
        }
        
        overrides[index] = {
            MainDish: mainDish,
            Category: category,
            SideDish: finalSideDish
        };
    });
    return overrides;
}

function applyOverrides() {
    for (const index in currentOverrides) {
        if (currentSchedule[index] && currentOverrides[index].MainDish) { // Check if override is valid
            currentSchedule[index] = {
                ...currentSchedule[index], // keep original Date and Day
                ...currentOverrides[index]
            };
        }
    }
}

function updateUrl() {
    const overrideStr = serializeOverrides(currentOverrides);
    const newUrl = `${window.location.pathname}?seed=${currentSeed}${overrideStr ? '&overrides=' + overrideStr : ''}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
}

function initializePlanFromUrl(seed, overridesStr) {
    currentOverrides = {};
    generateAndRender(seed, true);
    
    if (overridesStr) {
        currentOverrides = parseOverrides(overridesStr);
        applyOverrides();
        renderSchedule(currentSchedule);
        recalculateAndRenderShoppingList();
        updateUrl();
    }
}

function generateAndRender(seed, isReplacement = false) {
    const forYear = document.getElementById('duration-toggle').checked;
    const result = generateDinnerSchedule(forYear, seed);
    currentSchedule = result.schedule;
    currentSeed = result.usedSeed;
    
    if (!isReplacement || !new URLSearchParams(window.location.search).get('overrides')) {
        renderSchedule(currentSchedule);
        recalculateAndRenderShoppingList();
    }
    updateUrl();
    setupFirebaseListener(); // Re-attach listener to the new seed's channel

    if (!isReplacement) {
        savePlan(currentSeed, '');
    }

    document.getElementById('output').style.display = 'block';
    document.getElementById('print-btn').style.display = 'inline-flex';
}

function confirmReplacement(dayIndex, newMainDish, newCategory, newSideDish) {
    currentSchedule[dayIndex].MainDish = newMainDish;
    currentSchedule[dayIndex].Category = newCategory;
    currentSchedule[dayIndex].SideDish = newSideDish;

    currentOverrides[dayIndex] = {
        MainDish: newMainDish,
        SideDish: newSideDish,
        Category: newCategory,
    };
    
    updateUrl();
    renderSchedule(currentSchedule);
    recalculateAndRenderShoppingList();
    
    document.getElementById('save-changes-btn').style.display = 'inline-flex';
    document.getElementById('replace-modal').classList.remove('visible');
    
    publishOverrides(); // Publish the change to Firebase
}

function confirmPrepChange(dayIndex, newPrepTask) {
    const dayData = currentSchedule[dayIndex];
    let sideDishBase = (dayData.SideDish || "").split(' (+ ')[0];
    let newSideDish;

    if (newPrepTask) {
        newSideDish = `${sideDishBase} (+ Prep: ${newPrepTask})`;
    } else {
        newSideDish = sideDishBase;
    }

    dayData.SideDish = newSideDish;
    currentOverrides[dayIndex] = {
        MainDish: dayData.MainDish,
        SideDish: dayData.SideDish,
        Category: dayData.Category
    };
    
    updateUrl();
    
    document.getElementById('save-changes-btn').style.display = 'inline-flex';
    renderSchedule(currentSchedule);
    recalculateAndRenderShoppingList();
    document.getElementById('replace-modal').classList.remove('visible');

    publishOverrides(); // Publish the change to Firebase
}


// --- All other functions (renderShoppingList, openReplaceModal, etc.) remain here without changes ---
function handlePrintClick() { window.print(); }

function handleSavedPlanChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const seed = selectedOption.value;
    const overrides = selectedOption.dataset.overrides;

    if (seed) {
        document.getElementById('save-changes-btn').style.display = 'none';
        initializePlanFromUrl(parseInt(seed), overrides);
    }
}

function handleSaveChangesClick() {
    if (currentSeed) {
        const overrideStr = serializeOverrides(currentOverrides);
        savePlan(currentSeed, overrideStr);
        const btn = document.getElementById('save-changes-btn');
        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.style.display = 'none';
            btn.textContent = 'Save Changes';
        }, 2000);
    }
}

function renderSchedule(schedule) {
    const cardContainer = document.getElementById('schedule-container');
    const tableBody = document.getElementById('print-schedule-body');
    cardContainer.innerHTML = '';
    tableBody.innerHTML = '';
    schedule.forEach((day, index) => {
        const date = new Date(day.Date + 'T00:00:00');
        const dateString = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        
        let sideDishText = (day.SideDish || "").split(' (+ ')[0]; 
        let prepTask = (day.SideDish || "").includes(' (+ Prep:') ? day.SideDish.split(' (+ Prep: ')[1].replace(')', '') : null;
        
        const noPrepRule = RULES.find(r => r.type === 'NO_PREP_ON_CATEGORY' && r.category === day.Category);
        const isEligibleForPrep = !noPrepRule;

        let prepHtml = '';
        if (prepTask) {
            prepHtml = `<span class="extra">(+ Prep: ${prepTask} <span role="button" class="replace-prep-btn" onclick="openPrepModal(${index})" title="Replace/Remove Prep Task">&#x21bb;</span>)</span>`;
        } else if (isEligibleForPrep) {
            prepHtml = `<button class="btn btn-secondary btn-add-prep" onclick="openPrepModal(${index})">Add Prep Task</button>`;
        }

        const card = `
            <div class="day-card" data-index="${index}">
                <button class="replace-btn" onclick="openReplaceModal(${index})" title="Replace Meal">&#x21bb;</button>
                <div class="date">${dateString}</div>
                <div class="day">${day.Day}</div>
                <div class="meal-item">
                    <strong>${day.MainDish}</strong>
                    <span>${sideDishText}</span>
                    ${prepHtml}
                </div>
            </div>`;
        cardContainer.innerHTML += card;

        const row = `<tr><td>${dateString}</td><td>${day.Day}</td><td>${day.MainDish}</td><td>${day.SideDish || ""}</td></tr>`;
        tableBody.innerHTML += row;
    });
}

function renderShoppingList(shoppingList) {
    const container = document.getElementById('shopping-list-container');
    container.innerHTML = '';
    const categories = {};
    for(const item in shoppingList) {
        const { category } = shoppingList[item];
        if (!categories[category]) categories[category] = [];
        categories[category].push({ name: item, ...shoppingList[item] });
    }
    const sortedCategories = Object.keys(categories).sort();
    for(const category of sortedCategories) {
        let categoryHTML = `<div class="shopping-category"><h3>${category}</h3><ul>`;
        const sortedItems = categories[category].sort((a,b) => a.name.localeCompare(b.name));
        for(const item of sortedItems) {
            const unit = item.unit === 'unit' ? (item.qty > 1 ? ' units' : ' unit') : ` ${item.unit}`;
            const qty = item.unit === 'unit' ? item.qty : item.qty.toFixed(2);
            categoryHTML += `<li><span class="item-name">${item.name}</span> <span class="item-qty">${qty}${unit}</span></li>`;
        }
        categoryHTML += `</ul></div>`;
        container.innerHTML += categoryHTML;
    }
}

function renderSavedPlans() {
    const plans = getSavedPlans();
    const container = document.getElementById('saved-plans-container');
    const select = document.getElementById('saved-plans');
    select.innerHTML = '<option value="">- Previous Plans -</option>';
    if (plans.length > 0) {
        container.style.display = 'block';
        plans.forEach(plan => {
            const date = new Date(plan.date).toLocaleDateString();
            const option = document.createElement('option');
            option.value = plan.seed;
            option.dataset.overrides = plan.overrides || '';
            option.textContent = `Plan from ${date}${plan.overrides ? ' (Modified)' : ''}`;
            select.appendChild(option);
        });
    } else {
        container.style.display = 'none';
    }
}

function renderManagePlansView() {
    const plans = getSavedPlans();
    const container = document.getElementById('manage-plans-list');
    container.innerHTML = '';
    if (plans.length > 0) {
        plans.forEach(plan => {
            const date = new Date(plan.date).toLocaleDateString();
            const item = document.createElement('div');
            item.className = 'plan-item';
            item.innerHTML = `<span>Plan from ${date} (Seed: ${plan.seed})</span><button class="btn delete-btn" data-seed="${plan.seed}">Delete</button>`;
            container.appendChild(item);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeletePlanClick));
    } else {
        container.innerHTML = '<p>No saved plans found.</p>';
    }
}


function recalculateAndRenderShoppingList() {
    const shoppingList = generateShoppingList(currentSchedule.slice(0, 6));
    renderShoppingList(shoppingList);
}

function getSavedPlans() { return JSON.parse(localStorage.getItem('mealPlans') || '[]'); }

function savePlan(seed, overrideStr = '') {
    let plans = getSavedPlans();
    if (!plans.some(p => p.seed === seed && p.overrides === overrideStr)) {
        plans.unshift({ seed, overrides: overrideStr, date: new Date().toISOString() });
        if (plans.length > 10) plans = plans.slice(0, 10);
        localStorage.setItem('mealPlans', JSON.stringify(plans));
        renderSavedPlans();
    }
}

function deletePlan(seed) {
    let plans = getSavedPlans();
    plans = plans.filter(p => p.seed !== seed);
    localStorage.setItem('mealPlans', JSON.stringify(plans));
    renderSavedPlans();
    renderManagePlansView();
}
function handleDeletePlanClick(e) {
    const seed = parseInt(e.target.dataset.seed);
    if(confirm(`Are you sure you want to delete the plan with seed ${seed}?`)) {
        deletePlan(seed);
    }
}

function openReplaceModal(dayIndex) {
    const dayData = currentSchedule[dayIndex];
    let allMainsOptions = [];
    Object.keys(CONFIG.meal_options).forEach(cat => {
        CONFIG.meal_options[cat].main.forEach(main => {
            allMainsOptions.push({ dish: main, category: cat });
        });
    });

    const validReplacements = allMainsOptions.filter(item => item.dish !== dayData.MainDish);
    
    document.getElementById('modal-title').textContent = 'Step 1: Choose a Replacement Dish';
    const optionsContainer = document.getElementById('replacement-options');
    optionsContainer.innerHTML = '';
    
    validReplacements.forEach(item => {
        const button = document.createElement('button');
        button.textContent = `${item.dish} (${item.category})`;
        button.className = 'btn btn-secondary';
        button.onclick = () => showSideDishOptions(dayIndex, item.dish, item.category);
        optionsContainer.appendChild(button);
    });
    
    document.getElementById('replace-modal').classList.add('visible');
}

function showSideDishOptions(dayIndex, newMainDish, newCategory) {
    document.getElementById('modal-title').textContent = `Step 2: Choose Side for ${newMainDish}`;
    const optionsContainer = document.getElementById('replacement-options');
    optionsContainer.innerHTML = '';

    const sideSource = CONFIG.meal_options[newCategory].sides;
    let sideOptions = Array.isArray(sideSource) ? sideSource : (sideSource[newMainDish] || []);
    if (typeof sideOptions === 'string') sideOptions = [sideOptions];
    if (sideOptions.length === 0) { // No side dishes to choose
        confirmReplacement(dayIndex, newMainDish, newCategory, "");
        return;
    }
    
    sideOptions.forEach(side => {
        const button = document.createElement('button');
        button.textContent = side;
        button.className = 'btn btn-secondary';
        button.onclick = () => confirmReplacement(dayIndex, newMainDish, newCategory, side);
        optionsContainer.appendChild(button);
    });

    const backButton = document.createElement('button');
    backButton.textContent = '← Back to Main Dishes';
    backButton.className = 'btn btn-primary';
    backButton.style.marginTop = '1em';
    backButton.onclick = () => openReplaceModal(dayIndex);
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.appendChild(backButton);
    optionsContainer.appendChild(footer);
}

function openPrepModal(dayIndex) {
    const dayData = currentSchedule[dayIndex];
    document.getElementById('modal-title').textContent = `Choose Prep Task for ${dayData.MainDish}`;
    const optionsContainer = document.getElementById('replacement-options');
    optionsContainer.innerHTML = '';
    
    CONFIG.prep_tasks.forEach(task => {
        const button = document.createElement('button');
        button.textContent = task;
        button.className = 'btn btn-secondary';
        button.onclick = () => confirmPrepChange(dayIndex, task);
        optionsContainer.appendChild(button);
    });

    if ((dayData.SideDish || "").includes('(+ Prep:')) {
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove Prep Task';
        removeButton.className = 'btn btn-secondary';
        removeButton.style.borderColor = 'var(--accent-color)';
        removeButton.style.color = 'var(--accent-color)';
        removeButton.style.marginTop = '1em';
        removeButton.onclick = () => confirmPrepChange(dayIndex, null);
        optionsContainer.appendChild(removeButton);
    }
    
    document.getElementById('replace-modal').classList.add('visible');
}

function openTab(evt, tabName) {
  let i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";

  if (tabName === 'manage') {
      renderManagePlansView();
  }
}