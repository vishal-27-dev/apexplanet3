document.addEventListener('DOMContentLoaded', () => {

    // --- Constants and Setup ---
    const recommendationsGrid = document.getElementById('recommendations-grid');
    const recommendationsLoading = document.getElementById('recommendations-loading');
    const recommendationsError = document.getElementById('recommendations-error');
    const recommendationsListFile = 'recommendations.txt'; // Your list file

    // !! IMPORTANT: Replace with YOUR RapidAPI details !!
    // !! DO NOT COMMIT YOUR ACTUAL KEY TO GITHUB - Use environment variables in production
    const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // <-- YOUR KEY HERE
    const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com'; // <-- YOUR HOST HERE

    // You NEED to find the correct endpoint for SEARCHING by title in the imdb236 API docs
    // This is a GUESS - REPLACE IT with the actual search endpoint URL format
    const SEARCH_API_URL_BASE = `https://imdb236.p.rapidapi.com/search?query=`;

    const apiOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    };

    // --- Recommendation Loading ---

    async function fetchRecommendations() {
        if (!recommendationsGrid || !recommendationsLoading || !recommendationsError) return;

        showLoading();
        try {
             // 1. Check if API Key placeholder is replaced (basic check)
             if (!RAPIDAPI_KEY || RAPIDAPI_KEY.includes('YOUR') || RAPIDAPI_KEY.length < 20) {
                throw new Error("RapidAPI Key is missing or invalid. Please set it in script.js");
            }

            // 2. Fetch the list of titles from recommendations.txt
            const response = await fetch(recommendationsListFile);
            if (!response.ok) {
                throw new Error(`Failed to load recommendations list: ${response.statusText}`);
            }
            const text = await response.text();
            const titles = text.split('\n').map(title => title.trim()).filter(title => title.length > 0);

            if (titles.length === 0) {
                showError("No recommendation titles found in the list file.");
                return;
            }

            // 3. Fetch details for each title from the API
            const movieDataPromises = titles.map(title => searchMovieByTitle(title));
            const movieResults = await Promise.allSettled(movieDataPromises); // Use allSettled to continue even if some fail

            // 4. Process results and render cards
            recommendationsGrid.innerHTML = ''; // Clear grid
            let foundResults = false;
            movieResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    renderRecommendationCard(result.value);
                    foundResults = true;
                } else {
                    console.error(`Failed to fetch data for "${titles[index]}":`, result.reason || 'No result value');
                    // Optionally render a placeholder error card
                     // renderErrorCard(titles[index]);
                }
            });

             if (!foundResults) {
                 showError("Could not fetch details for any recommendations. Check API/titles.");
             }

            hideLoading();

        } catch (error) {
            console.error("Error fetching recommendations:", error);
            showError(error.message || "An unknown error occurred while loading recommendations.");
        }
    }

    async function searchMovieByTitle(title) {
        // IMPORTANT: Adapt the endpoint and query parameter based on imdb236 documentation for *searching*
        const searchUrl = `${SEARCH_API_URL_BASE}${encodeURIComponent(title)}`;

        const response = await fetch(searchUrl, apiOptions);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error (${response.status}) for "${title}": ${errorBody}`);
            throw new Error(`API request failed for "${title}" with status ${response.status}`);
        }

        const data = await response.json();

        // IMPORTANT: Process the search result.
        // APIs usually return an *array* of results for a search.
        // You need to pick the *best match* (often the first result).
        // The structure (data[0]?, data.results?) DEPENDS ENTIRELY ON THE imdb236 API.
        // ====> ADAPT THE FOLLOWING LINES <====
        const firstResult = data && data.length > 0 ? data[0] : null; // Example: assuming API returns array directly

        if (!firstResult) {
             console.warn(`No results found for "${title}"`);
             return null; // Indicate no result found
        }

        // Extract necessary data from the firstResult. Property names depend on the API!
        // ====> ADAPT PROPERTY NAMES <====
        return {
             // ID needed for details page link (e.g., 'tt1234567') - VERY IMPORTANT
             // You MUST find how the imdb236 API provides the IMDb ID
             id: firstResult.imdb_id || firstResult.id, // ADJUST PROPERTY NAME
             title: firstResult.title || title,      // ADJUST PROPERTY NAME
             year: firstResult.year || 'N/A',         // ADJUST PROPERTY NAME
             genre: firstResult.genres ? firstResult.genres.join(', ') : 'N/A', // ADJUST PROPERTY NAME
             poster: firstResult.image || 'placeholder.jpg', // ADJUST PROPERTY NAME - Get poster URL
             rating: firstResult.rating ? firstResult.rating.value : 'N/A' // ADJUST PROPERTY NAME - Find rating value
        };
         // ====> END ADAPTATION <====
    }

    function renderRecommendationCard(movieData) {
         if (!movieData || !movieData.id) return; // Need an ID to link

        const cardLink = document.createElement('a');
        cardLink.href = `details.html?id=${movieData.id}`; // Link to detail page with ID
        cardLink.classList.add('recommendation-card-link');

        const card = document.createElement('div');
        card.classList.add('recommendation-card');

        // Check if poster URL is valid, otherwise use placeholder
        const posterSrc = movieData.poster && movieData.poster.startsWith('http') ? movieData.poster : 'assets/placeholder-poster.png'; // Provide a placeholder image path

        card.innerHTML = `
            <img src="${posterSrc}" alt="${movieData.title || 'Poster'}" loading="lazy" onerror="this.onerror=null;this.src='assets/placeholder-poster.png';">
            <div class="card-content">
                <h3>${movieData.title || 'No Title'}</h3>
                <p class="card-meta">${movieData.year || ''} | ${movieData.genre || 'Unknown Genre'}</p>
                <div class="rating">${movieData.rating !== 'N/A' ? `⭐ ${movieData.rating}` : ''}</div>
            </div>
        `;
        // Append comment count span IF needed later - requires mapping logic
        // card.innerHTML += `<span class="disqus-comment-count" data-disqus-url="${cardLink.href}"></span>`;


        cardLink.appendChild(card);
        recommendationsGrid.appendChild(cardLink);
    }

     function renderErrorCard(title) {
         const errorCard = document.createElement('div');
        errorCard.classList.add('recommendation-card', 'error-card'); // Add specific class
        errorCard.innerHTML = `
             <div class="card-content">
                 <h3>${title}</h3>
                 <p class="card-meta">Failed to load details</p>
             </div>`;
         recommendationsGrid.appendChild(errorCard); // Add error indication directly
     }


    function showLoading() {
        recommendationsLoading.classList.add('active');
        recommendationsError.style.display = 'none';
        recommendationsGrid.style.display = 'none';
    }

    function hideLoading() {
        recommendationsLoading.classList.remove('active');
        recommendationsGrid.style.display = 'grid'; // Or 'flex' depending on style
    }

    function showError(message) {
        recommendationsLoading.classList.remove('active');
        recommendationsError.textContent = message;
        recommendationsError.style.display = 'block';
        recommendationsGrid.innerHTML = ''; // Clear any partial results
        recommendationsGrid.style.display = 'none';
    }


    // --- Watchlist Logic (Renamed To-Do) ---
    const watchlistItemInput = document.getElementById('watchlistItemInput');
    const addWatchlistItemButton = document.getElementById('addWatchlistItemButton');
    const watchlistList = document.getElementById('watchlistList');

    if (addWatchlistItemButton && watchlistItemInput && watchlistList) {
        addWatchlistItemButton.addEventListener('click', handleAddItem);
        watchlistItemInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); handleAddItem(); }
        });
        watchlistList.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-watchlist-btn')) {
                 removeItem(event.target.closest('li'));
            }
             // Add complete/toggle logic here if needed later
        });
    }

    function handleAddItem() {
        const itemText = watchlistItemInput.value.trim();
        if (itemText === '') return; // Ignore empty input
        createWatchlistItem(itemText);
        watchlistItemInput.value = '';
        watchlistItemInput.focus();
    }

    function createWatchlistItem(itemText) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(itemText)}</span>
            <button class="remove-watchlist-btn" title="Remove Item">×</button>
        `;
        watchlistList.appendChild(li);
    }

    function removeItem(itemElement) {
        if (itemElement && itemElement.parentNode === watchlistList) {
            itemElement.remove();
        }
    }
     // Basic HTML escaping
     function escapeHTML(str) {
       return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''');
     }

    // --- Contact Form Logic ---
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('form-status');

    if (contactForm && formStatus) {
        // **IMPORTANT**: Replace with YOUR Formspree endpoint
        const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'; // <--- REPLACE THIS!

        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        const fieldsToValidate = [
            { input: nameInput, required: true, name: "Name" },
            { input: emailInput, required: true, name: "Email", isEmail: true },
            { input: messageInput, required: true, name: "Message" }
        ];

        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            setStatus('', ''); // Clear status

            // Client-side validation first
            let isFormValid = true;
            clearAllErrors(fieldsToValidate);
            fieldsToValidate.forEach(fieldObj => {
                const { input, required, name, isEmail } = fieldObj;
                const value = input.value.trim();
                if (required && value === '') { isFormValid = false; showError(input, `Required`); }
                 else if (isEmail && value !== '' && !validateEmailFormat(value)) { isFormValid = false; showError(input, `Invalid Email`); }
            });

            if (!isFormValid) {
                 setStatus('Please fix errors above.', 'error');
                 const firstErrorField = contactForm.querySelector('.input-error');
                 if(firstErrorField) firstErrorField.focus();
                return;
            }

            // Validation passed, prepare and send data
            const formData = new FormData(contactForm);
            setStatus('Sending...', ''); // Indicate sending

            try {
                 if (!FORMSPREE_ENDPOINT || FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
                     throw new Error("Formspree endpoint is not configured in script.js");
                 }

                const response = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json' // Formspree recommends this
                    }
                });

                if (response.ok) {
                    setStatus('Message sent successfully!', 'success');
                    contactForm.reset();
                } else {
                    // Try to get error message from Formspree if possible
                    const responseData = await response.json();
                     const errorMessage = responseData.errors ? responseData.errors.map(e => e.message).join(', ') : `Request failed (${response.status})`;
                    throw new Error(errorMessage);
                }

            } catch (error) {
                 console.error("Form submission error:", error);
                 setStatus(`Error: ${error.message || 'Could not send message.'}`, 'error');
            }
        });
         // Clear errors on input
         fieldsToValidate.forEach(fieldObj => fieldObj.input.addEventListener('input', () => clearError(fieldObj.input)));

    }
     // Helper to set status message style
    function setStatus(message, type) { // type = 'success' or 'error' or ''
        if (!formStatus) return;
        formStatus.textContent = message;
        formStatus.className = 'form-status-message'; // Reset class
         if (type) {
             formStatus.classList.add(type);
        }
    }
     // Form validation helpers (minor adjustments for context)
    function showError(inputElement, message) {
         clearError(inputElement); // Clear previous error first
         const formGroup = inputElement.closest('.form-group');
         if (formGroup) { const errorElement = formGroup.querySelector('.error-message'); if (errorElement) errorElement.textContent = message; inputElement.classList.add('input-error'); }
     }
    function clearError(inputElement) {
        const formGroup = inputElement.closest('.form-group');
        if (formGroup) { const errorElement = formGroup.querySelector('.error-message'); if (errorElement) errorElement.textContent = ''; inputElement.classList.remove('input-error'); }
     }
     function clearAllErrors(fields) { fields.forEach(fieldObj => clearError(fieldObj.input)); }
     function validateEmailFormat(email) { const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(String(email).toLowerCase()); }


    // --- Utility: Update Year in Footer ---
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }


    // --- Initial Load ---
    fetchRecommendations();

}); // End DOMContentLoaded
