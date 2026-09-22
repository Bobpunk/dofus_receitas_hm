document.addEventListener('DOMContentLoaded', () => {
    const App = {
        elements: {},
        state: {
            currentItem: null,
            localItemDB: {},
            idToItemMap: {},
            itemNames: [],
            savedRecipes: {},
        },
        config: {
            API_URL: 'http://localhost:5000/api',
        },

        init() {
            this.cacheDOMElements();
            this.bindEvents();
            this.loadInitialData();
            this.initializeRuneCalculator();
        },

        cacheDOMElements() {
            const ids = [
                'mainView', 'createView', 'listView', 'calculatorView', 'runeCalculatorView',
                'topRecipesView', 'workbenchView', 'showCreateViewButton', 'showListViewButton',
                'showRuneCalculatorButton', 'showTopRecipesButton', 'showWorkbenchButton', 'backToMainViewButton',
                'backToMainFromList', 'backToSearchViewButton', 'backToMainFromRuneCalc', 'backToMainFromTopRecipes',
                'backToMainFromWorkbench', 'searchInput', 'searchButton', 'creationStep1', 'creationStep2',
                'newItemName', 'fetchAndFillButton', 'ingredientFieldsContainer', 'saveRecipeButton',
                'recipeResult', 'calculatorInputs', 'calculateButton', 'addToWorkbenchButton',
                'summarySection', 'savedRecipesGrid', 'toast-notification', 'categoryContainer',
                'topRecipesContainer', 'recalculateTopRecipes', 'workbenchFinalItems', 'workbenchIngredients',
                'clearWorkbenchButton', 'workbenchSummary', 'runaLvl1Price', 'runaLvl2Price', 'runaLvl3Price',
                'costViaLvl1', 'costViaLvl2', 'batchProfit', 'batchDetails'
            ];
            ids.forEach(id => {
                
                const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
                this.elements[key] = document.getElementById(id);
            });
            this.elements.recipeSourceNotice = document.querySelector('.recipe-source-notice');
            this.elements.allViews = [
                this.elements.mainView, this.elements.createView, this.elements.listView,
                this.elements.calculatorView, this.elements.runeCalculatorView,
                this.elements.topRecipesView, this.elements.workbenchView
            ];
        },

        bindEvents() {
            const e = this.elements;

            // Navegação principal
            e.showCreateViewButton.addEventListener('click', () => this.showView(e.createView, this.resetCreateView));
            e.showListViewButton.addEventListener('click', () => this.showView(e.listView, this.loadAndDisplaySavedRecipes));
            e.showRuneCalculatorButton.addEventListener('click', () => this.showView(e.runeCalculatorView));
            e.showTopRecipesButton.addEventListener('click', () => this.showView(e.topRecipesView, this.displayTopProfits));
            e.showWorkbenchButton.addEventListener('click', () => this.showView(e.workbenchView, this.displayWorkbench));

            // Botões de "Voltar"
            [e.backToMainViewButton, e.backToMainFromList, e.backToSearchViewButton, e.backToMainFromRuneCalc, e.backToMainFromTopRecipes, e.backToMainFromWorkbench].forEach(btn => {
                btn.addEventListener('click', () => this.showView(e.mainView));
            });

            // Outros eventos
            e.searchButton.addEventListener('click', () => this.handleSearch());
            e.fetchAndFillButton.addEventListener('click', () => this.handleFetchAndFill());
            e.calculateButton.addEventListener('click', () => this.calculateRecipeProfit());
            e.saveRecipeButton.addEventListener('click', () => this.saveRecipe());
            e.recalculateTopRecipes.addEventListener('click', () => this.displayTopProfits());
            e.addToWorkbenchButton.addEventListener('click', () => this.handleAddToWorkbench());
            e.clearWorkbenchButton.addEventListener('click', () => this.handleClearWorkbench());

            // Delegação de eventos para performance
            document.querySelector('main').addEventListener('input', this.handleMainInput.bind(this));
            document.addEventListener('click', this.handleDocumentClick.bind(this));
            e.savedRecipesGrid.addEventListener('click', this.handleSavedRecipeClick.bind(this));
            e.recipeResult.addEventListener('click', e => this.handleShiftClickToCopy(e));
            e.topRecipesContainer.addEventListener('click', this.handleTopRecipeClick.bind(this));
            e.workbenchView.addEventListener('change', this.handleWorkbenchChange.bind(this));
            e.workbenchView.addEventListener('click', this.handleWorkbenchClick.bind(this));
        },

 
        showView(viewToShow, preRenderAction) {
            this.elements.allViews.forEach(view => view.classList.add('hidden'));
            if (preRenderAction) preRenderAction.call(this);
            viewToShow.classList.remove('hidden');
        },

        showToast(message) {
            this.elements.toastNotification.textContent = message;
            this.elements.toastNotification.classList.remove("hidden");
            this.elements.toastNotification.classList.add("show");
            setTimeout(() => this.elements.toastNotification.classList.remove("show"), 2000);
        },

       
        async loadInitialData() {
            await Promise.all([this.fetchItemDatabase(), this.fetchSavedRecipes()]);
        },
        async fetchItemDatabase() {
            try {
                const response = await fetch(`${this.config.API_URL}/item_database`);
                if (!response.ok) throw new Error("Falha ao carregar o banco de dados de itens.");
                this.state.localItemDB = await response.json();
                this.state.itemNames = Object.keys(this.state.localItemDB);
                this.state.idToItemMap = Object.values(this.state.localItemDB).reduce((acc, item) => {
                    acc[item.ankama_id] = item;
                    return acc;
                }, {});
            } catch (error) {
                console.error("Erro ao carregar o banco de dados de itens:", error);
            }
        },
        async fetchSavedRecipes() {
            try {
                const response = await fetch(`${this.config.API_URL}/recipes`);
                if (!response.ok) throw new Error("Falha ao buscar receitas.");
                this.state.savedRecipes = await response.json();
            } catch (error) {
                console.error(error);
                this.state.savedRecipes = {};
            }
        },

        // --- FUNÇÕES UTILITÁRIAS ---
        criarChaveLimpa(str) {
            if (typeof str !== 'string') return '';
            return str.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]/g, "");
        },

        getPrices() {
            return JSON.parse(localStorage.getItem("dofus_prices_hm")) || {};
        },

        savePrice(key, price) {
            const prices = this.getPrices();
            prices[key] = price;
            localStorage.setItem("dofus_prices_hm", JSON.stringify(prices));
        },

        copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text)
                    .then(() => this.showToast(`"${text}" copiado!`))
                    .catch(err => console.error("Falha ao copiar texto: ", err));
            }
        },

        // --- HANDLERS DE EVENTOS ---
        handleMainInput(e) {
            if (e.target.matches("#searchInput, #newItemName, .ingredient-name")) {
                this.handleAutocomplete(e);
            }
        },

        handleDocumentClick(e) {
            if (!e.target.closest(".search-wrapper")) {
                document.querySelectorAll(".suggestions-container").forEach(el => el.style.display = "none");
            }
        },

        async handleSearch() {
            await this.fetchSavedRecipes();
            const searchTerm = this.elements.searchInput.value.trim();
            const searchKey = this.criarChaveLimpa(searchTerm);

            for (const category in this.state.savedRecipes) {
                if (this.state.savedRecipes[category][searchKey]) {
                    this.state.currentItem = this.state.savedRecipes[category][searchKey];
                    this.displayCalculator(this.state.currentItem);
                    this.showView(this.elements.calculatorView);
                    return;
                }
            }

            const dbItem = this.state.localItemDB[searchKey];
            if (dbItem && dbItem.recipe) {
                const translatedRecipe = this.translateApiRecipe(dbItem);
                if (translatedRecipe) {
                    this.state.currentItem = translatedRecipe;
                    this.displayCalculator(translatedRecipe);
                    this.showView(this.elements.calculatorView);
                    return;
                }
            }
            alert("Receita não encontrada.");
        },
        
       
        displayCalculator(item) {
            this.state.currentItem = item;
            this.elements.summarySection.innerHTML = "";
            const yieldAmount = item.yield || 1;
            this.elements.recipeResult.innerHTML = `
                <div class="recipe-header" data-name="${item.name}">
                    <img src="images/${item.image}" alt="${item.name}"><h3>${item.name}</h3>
                </div>
                <p style="text-align: center;">Produz: <strong>${yieldAmount}</strong></p>
                <ul>${item.ingredients.map(ing => `
                    <li class="ingredient-display-row" data-name="${ing.name}">
                        <img src="images/${ing.image}" alt="${ing.name}"><span>${ing.quantity}x ${ing.name}</span>
                    </li>`).join("")}
                </ul>`;

            const prices = this.getPrices();
            let inputsHTML = `
                <div class="price-input-group">
                    <label>Preço de Venda de 1x ${item.name}:</label>
                    <input type="number" id="finalItemPrice" placeholder="Preço" value="${prices[this.criarChaveLimpa(item.name)] || ""}">
                </div>
                <div class="price-input-group">
                    <label for="quantityToCraft">Quantidade que deseja produzir:</label>
                    <input type="number" id="quantityToCraft" value="1" min="1">
                </div><hr>`;
            inputsHTML += item.ingredients.map((ing, index) => `
                <div class="price-input-group">
                    <label>Preço de 1x ${ing.name}:</label>
                    <input type="number" class="ingredient-price" id="ingredientPrice_${index}" placeholder="Preço" value="${prices[this.criarChaveLimpa(ing.name)] || ""}">
                </div>`).join("");
            this.elements.calculatorInputs.innerHTML = inputsHTML;
        }

       
    };

    App.init();

});

